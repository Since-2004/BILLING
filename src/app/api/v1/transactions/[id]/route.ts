import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { user_branch_access: true }
  })
  
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()

  try {
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      // 1. Fetch old transaction
      const oldTx = await tx.transaction.findUnique({
        where: { id: params.id },
        include: { items: true, payments: true }
      })

      if (!oldTx || oldTx.company_id !== dbUser.company_id) {
        throw new Error('Transaction not found')
      }

      // 2. Revert old loyalty points
      if (oldTx.type === 'SALES_INVOICE' && oldTx.party_id) {
        const oldPoints = Math.floor(oldTx.total / 10000)
        if (oldPoints > 0) {
          const reward = await tx.loyaltyReward.findUnique({ where: { client_id: oldTx.party_id } })
          if (reward) {
            await tx.loyaltyReward.update({
              where: { client_id: oldTx.party_id },
              data: { points: Math.max(0, reward.points - oldPoints) }
            })
          }
        }
      }

      // 3. Delete old related records (StockLedgers, JournalEntries)
      await tx.stockLedger.deleteMany({ where: { transaction_id: params.id } })
      await tx.journalEntry.deleteMany({ where: { reference: params.id } })
      
      // Delete old sub-records of transaction to let us recreate them clean
      await tx.transactionItem.deleteMany({ where: { transaction_id: params.id } })
      await tx.transactionTax.deleteMany({ where: { transaction_id: params.id } })
      await tx.transactionPayment.deleteMany({ where: { transaction_id: params.id } })

      // 4. Resolve branch
      const defaultBranchId = dbUser.user_branch_access[0]?.branch_id
      const branchId = body.branch_id || defaultBranchId || oldTx.branch_id

      const partyId = body.party_id || oldTx.party_id
      const partyName = body.party_name || oldTx.party_name
      const party = partyId
        ? await tx.client.findUnique({ where: { id: partyId } })
        : (partyName ? await tx.client.findFirst({ where: { company_id: dbUser.company_id!, name: partyName } }) : null)

      const isCredit = body.payment_mode === 'CREDIT' || party?.client_type === 'CREDIT'

      const amtPaid = isCredit ? 0 : Math.round(Number(body.amount_paid) ?? 0)
      const totalAmt = Math.round(Number(body.total) || 0)
      const computedStatus = isCredit
        ? (amtPaid > 0 && amtPaid < totalAmt ? 'PARTIAL' : (amtPaid >= totalAmt && totalAmt > 0 ? 'PAID' : 'PENDING'))
        : (body.status || (amtPaid >= totalAmt && totalAmt > 0 ? 'PAID' : (amtPaid > 0 ? 'PARTIAL' : 'PENDING')))

      // 5. Update main transaction and recreate sub-records
      const newTx = await tx.transaction.update({
        where: { id: params.id },
        data: {
          branch_id: branchId,
          date: new Date(body.date || oldTx.date),
          party_id: body.party_id || null,
          party_name: body.party_name || 'Walk-in Customer',
          subtotal: Math.round(Number(body.subtotal) || 0),
          discount: Math.round(Number(body.discount) || 0),
          tax_amount: Math.round(Number(body.tax_amount) || 0),
          total: totalAmt,
          amount_paid: amtPaid,
          status: computedStatus,
          notes: body.notes || null,
          items: {
            create: body.items.map((item: any) => ({
              item_id: item.item_id || null,
              item_name: item.item_name,
              quantity: Number(item.quantity) || 1,
              rate: Math.round(Number(item.rate) || 0),
              discount: Math.round(Number(item.discount) || 0),
              tax_rate: Number(item.tax_rate) || 0,
              tax_amount: Math.round(Number(item.tax_amount) || 0),
              total: Math.round(Number(item.total) || 0)
            }))
          },
          payments: {
            create: isCredit || amtPaid === 0 ? [] : [{
              mode: body.payment_mode || 'CASH',
              amount: amtPaid
            }]
          }
        },
        include: { items: true, payments: true }
      })

      // 6. Stock Ledger updates
      if (['SALES_INVOICE', 'PURCHASE_BILL', 'SALES_RETURN', 'PURCHASE_RETURN'].includes(newTx.type)) {
        for (const item of newTx.items) {
          if (!item.item_id) continue
          const type = newTx.type === 'SALES_INVOICE' || newTx.type === 'PURCHASE_RETURN' ? 'OUT' : 'IN'
          await tx.stockLedger.create({
            data: {
              company_id: dbUser.company_id!,
              branch_id: branchId,
              item_id: item.item_id,
              transaction_id: newTx.id,
              type: type,
              quantity: item.quantity,
              date: newTx.date,
              remarks: `${newTx.type} ${newTx.transaction_no} (Edited)`
            }
          })
        }
      }

      // 7. Journal Entries (Simplified Double Entry)
      const getOrCreateAccount = async (name: string, type: string) => {
        let acc = await tx.account.findFirst({ where: { company_id: dbUser.company_id!, name } })
        if (!acc) acc = await tx.account.create({ data: { company_id: dbUser.company_id!, name, type } })
        return acc
      }

      const salesAccount = await getOrCreateAccount('Sales Revenue', 'REVENUE')
      const purchaseAccount = await getOrCreateAccount('Purchase Account', 'EXPENSE')
      const partyAccount = await getOrCreateAccount(newTx.party_name || 'Walk-in/Cash Party', newTx.type === 'SALES_INVOICE' ? 'ASSET' : 'LIABILITY')
      const cashAccount = await getOrCreateAccount('Cash in Hand', 'ASSET')
      const taxAccount = await getOrCreateAccount(newTx.type === 'SALES_INVOICE' ? 'GST Payable' : 'GST Receivable', newTx.type === 'SALES_INVOICE' ? 'LIABILITY' : 'ASSET')

      const partyReturnAccountSales = await getOrCreateAccount(newTx.party_name || 'Walk-in/Cash Party', 'ASSET')
      const taxReturnAccountSales = await getOrCreateAccount('GST Payable', 'LIABILITY')
      
      const partyReturnAccountPurchase = await getOrCreateAccount(newTx.party_name || 'Walk-in/Cash Party', 'LIABILITY')
      const taxReturnAccountPurchase = await getOrCreateAccount('GST Receivable', 'ASSET')

      if (newTx.type === 'SALES_INVOICE') {
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Sale Invoice ${newTx.transaction_no} (Edited)`,
            lines: {
              create: [
                { account_id: partyAccount.id, debit: newTx.total, credit: 0 },
                { account_id: salesAccount.id, debit: 0, credit: newTx.subtotal },
                { account_id: taxAccount.id, debit: 0, credit: newTx.tax_amount }
              ].filter(l => l.debit > 0 || l.credit > 0)
            }
          }
        })
      } else if (newTx.type === 'PURCHASE_BILL') {
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Purchase Bill ${newTx.transaction_no} (Edited)`,
            lines: {
              create: [
                { account_id: purchaseAccount.id, debit: newTx.subtotal, credit: 0 },
                { account_id: taxAccount.id, debit: newTx.tax_amount, credit: 0 },
                { account_id: partyAccount.id, debit: 0, credit: newTx.total }
              ].filter(l => l.debit > 0 || l.credit > 0)
            }
          }
        })
      } else if (newTx.type === 'SALES_RETURN') {
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Sale Return ${newTx.transaction_no} (Edited)`,
            lines: {
              create: [
                { account_id: salesAccount.id, debit: newTx.subtotal, credit: 0 },
                { account_id: taxReturnAccountSales.id, debit: newTx.tax_amount, credit: 0 },
                { account_id: partyReturnAccountSales.id, debit: 0, credit: newTx.total }
              ].filter(l => l.debit > 0 || l.credit > 0)
            }
          }
        })
      } else if (newTx.type === 'PURCHASE_RETURN') {
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Purchase Return ${newTx.transaction_no} (Edited)`,
            lines: {
              create: [
                { account_id: partyReturnAccountPurchase.id, debit: newTx.total, credit: 0 },
                { account_id: purchaseAccount.id, debit: 0, credit: newTx.subtotal },
                { account_id: taxReturnAccountPurchase.id, debit: 0, credit: newTx.tax_amount }
              ].filter(l => l.debit > 0 || l.credit > 0)
            }
          }
        })
      }

      // If Paid, Create Payment Journal
      if (newTx.amount_paid > 0) {
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Payment for ${newTx.transaction_no} (Edited)`,
            lines: {
              create: newTx.type === 'SALES_INVOICE' ? [
                { account_id: cashAccount.id, debit: newTx.amount_paid, credit: 0 },
                { account_id: partyAccount.id, debit: 0, credit: newTx.amount_paid }
              ] : [
                { account_id: partyAccount.id, debit: newTx.amount_paid, credit: 0 },
                { account_id: cashAccount.id, debit: 0, credit: newTx.amount_paid }
              ]
            }
          }
        })
      }

      // Award Loyalty Points for Sales Invoices (1 point per ₹100 spent)
      if (newTx.type === 'SALES_INVOICE' && body.party_id) {
        const pointsToAward = Math.floor(newTx.total / 10000)
        if (pointsToAward > 0) {
          await tx.loyaltyReward.upsert({
            where: { client_id: body.party_id },
            update: { points: { increment: pointsToAward } },
            create: {
              company_id: newTx.company_id,
              client_id: body.party_id,
              points: pointsToAward,
              tier: 'SILVER'
            }
          })
        }
      }

      return newTx
    }, {
      timeout: 15000
    })

    return NextResponse.json({ success: true, data: updatedTransaction })
  } catch (error: any) {
    console.error('Transaction update failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Fetch transaction first to verify it belongs to user's company and deduct loyalty points
      const transaction = await tx.transaction.findUnique({
        where: { id: params.id }
      })

      if (!transaction || transaction.company_id !== dbUser.company_id) {
        throw new Error('Transaction not found')
      }

      // 2. Revert loyalty points
      if (transaction.type === 'SALES_INVOICE' && transaction.party_id) {
        const points = Math.floor(transaction.total / 10000)
        if (points > 0) {
          const reward = await tx.loyaltyReward.findUnique({ where: { client_id: transaction.party_id } })
          if (reward) {
            await tx.loyaltyReward.update({
              where: { client_id: transaction.party_id },
              data: { points: Math.max(0, reward.points - points) }
            })
          }
        }
      }

      // 3. Delete StockLedger movements associated with this transaction
      await tx.stockLedger.deleteMany({ where: { transaction_id: params.id } })

      // 4. Delete Journal Entries (and JournalEntryLines by Cascade onDelete)
      await tx.journalEntry.deleteMany({ where: { reference: params.id } })

      // 5. Delete Transaction (which cascades to TransactionItem, TransactionTax, and TransactionPayment)
      await tx.transaction.delete({ where: { id: params.id } })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Transaction deletion failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Support fetching single transaction
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  try {
    const tx = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        items: true,
        payments: true,
        branch: true
      }
    })

    if (!tx || tx.company_id !== dbUser.company_id) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: tx })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
