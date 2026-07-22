import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ 
    where: { id: user.id },
    include: { user_branch_access: true }
  })
  
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()

  const defaultBranchId = dbUser.user_branch_access[0]?.branch_id
  const branchId = body.branch_id || defaultBranchId
  if (!branchId) return NextResponse.json({ error: 'No branch access' }, { status: 403 })

  try {
    // Fetch or create required accounts outside the transaction to avoid lock/timeout issues
    const getOrCreateAccount = async (name: string, type: string) => {
      let acc = await prisma.account.findFirst({ where: { company_id: dbUser.company_id!, name } })
      if (!acc) acc = await prisma.account.create({ data: { company_id: dbUser.company_id!, name, type } })
      return acc
    }

    const salesAccount = await getOrCreateAccount('Sales Revenue', 'REVENUE')
    const purchaseAccount = await getOrCreateAccount('Purchase Account', 'EXPENSE')
    const partyAccount = await getOrCreateAccount(body.party_name || 'Walk-in/Cash Party', body.type === 'SALES_INVOICE' ? 'ASSET' : 'LIABILITY')
    const cashAccount = await getOrCreateAccount('Cash in Hand', 'ASSET')
    const taxAccount = await getOrCreateAccount(body.type === 'SALES_INVOICE' ? 'GST Payable' : 'GST Receivable', body.type === 'SALES_INVOICE' ? 'LIABILITY' : 'ASSET')

    const partyReturnAccountSales = await getOrCreateAccount(body.party_name || 'Walk-in/Cash Party', 'ASSET')
    const taxReturnAccountSales = await getOrCreateAccount('GST Payable', 'LIABILITY')
    
    const partyReturnAccountPurchase = await getOrCreateAccount(body.party_name || 'Walk-in/Cash Party', 'LIABILITY')
    const taxReturnAccountPurchase = await getOrCreateAccount('GST Receivable', 'ASSET')

    const transaction = await prisma.$transaction(async (tx) => {
      const txDate = new Date(body.date || Date.now())
      const fyStart = txDate.getMonth() >= 3
        ? new Date(txDate.getFullYear(), 3, 1)
        : new Date(txDate.getFullYear() - 1, 3, 1)
      const fyEnd = new Date(fyStart.getFullYear() + 1, 3, 1)

      const prefixMap: Record<string, string> = {
        SALES_INVOICE: 'INV', PURCHASE_BILL: 'PUR',
        QUOTATION: 'QTN', SALES_RETURN: 'SRN', PURCHASE_RETURN: 'PRN'
      }
      const fyShort = `${fyStart.getFullYear()}-${String(fyEnd.getFullYear() % 100).padStart(2, '0')} `
      const prefix = `${prefixMap[body.type || 'SALES_INVOICE'] || 'TXN'}/${fyShort.trim()}/`

      // Find the latest transaction of the same type in the same financial year to get the last number
      const lastTx = await tx.transaction.findFirst({
        where: {
          company_id: dbUser.company_id!,
          type: body.type || 'SALES_INVOICE',
          date: { gte: fyStart, lt: fyEnd }
        },
        orderBy: {
          transaction_no: 'desc'
        }
      })

      let nextNumber = 1
      if (lastTx) {
        const lastSlashIdx = lastTx.transaction_no.lastIndexOf('/')
        if (lastSlashIdx !== -1) {
          const lastNumStr = lastTx.transaction_no.substring(lastSlashIdx + 1)
          const lastNum = parseInt(lastNumStr, 10)
          if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1
          }
        }
      }

      const transaction_no = `${prefix}${String(nextNumber).padStart(5, '0')}`

      const party = body.party_id
        ? await tx.client.findUnique({ where: { id: body.party_id } })
        : (body.party_name ? await tx.client.findFirst({ where: { company_id: dbUser.company_id!, name: body.party_name } }) : null)

      const isCredit = body.payment_mode === 'CREDIT' || party?.client_type === 'CREDIT'

      const amtPaid = isCredit ? 0 : Math.round(Number(body.amount_paid) ?? 0)
      const totalAmt = Math.round(Number(body.total) || 0)
      const computedStatus = isCredit
        ? (amtPaid > 0 && amtPaid < totalAmt ? 'PARTIAL' : (amtPaid >= totalAmt && totalAmt > 0 ? 'PAID' : 'PENDING'))
        : (body.status || (amtPaid >= totalAmt && totalAmt > 0 ? 'PAID' : (amtPaid > 0 ? 'PARTIAL' : 'PENDING')))

      // Create the main transaction
      const newTx = await tx.transaction.create({
        data: {
          company_id: dbUser.company_id!,
          branch_id: branchId,
          type: body.type || 'SALES_INVOICE',
          transaction_no: body.transaction_no || transaction_no,
          date: new Date(body.date || Date.now()),
          party_id: body.party_id,
          party_name: body.party_name,
          subtotal: Math.round(Number(body.subtotal) || 0),
          discount: Math.round(Number(body.discount) || 0),
          tax_amount: Math.round(Number(body.tax_amount) || 0),
          total: totalAmt,
          amount_paid: amtPaid,
          status: computedStatus,
          notes: body.notes,
          created_by: user.id,
          items: {
            create: body.items.map((item: any) => ({
              item_id: item.item_id,
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
        include: { items: true }
      })

      // 2. Stock Ledger updates (Skip for non-accounting vouchers)
      if (['SALES_INVOICE', 'PURCHASE_BILL', 'SALES_RETURN', 'PURCHASE_RETURN'].includes(newTx.type)) {
        for (const item of newTx.items) {
          if (!item.item_id) continue;
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
              remarks: `${newTx.type} ${newTx.transaction_no}`
            }
          })
        }

        // 3. Journal Entries (Simplified Double Entry)

      if (newTx.type === 'SALES_INVOICE') {
        // Create Sale Journal
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Sale Invoice ${newTx.transaction_no}`,
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
        // Create Purchase Journal
        await tx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            date: newTx.date,
            reference: newTx.id,
            narration: `Purchase Bill ${newTx.transaction_no}`,
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
            narration: `Sale Return ${newTx.transaction_no}`,
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
            narration: `Purchase Return ${newTx.transaction_no}`,
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
            narration: `Payment for ${newTx.transaction_no}`,
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

    return NextResponse.json({ success: true, data: transaction })
  } catch (error: any) {
    console.error('Transaction creation failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'SALES_INVOICE'
  const page = Number(searchParams.get('page') || 1)
  const perPage = 50
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: any = {
    company_id: dbUser.company_id,
    ...(type && type !== 'DAILY_ENTRY' && { type }),
    ...(type === 'DAILY_ENTRY' && {
      type: 'SALES_INVOICE',
      OR: [
        { notes: { startsWith: 'DC No:' } },
        { party_name: 'Daily Sales Customer' }
      ]
    }),
    ...(search && {
      OR: [
        { transaction_no: { contains: search } },
        { party_name: { contains: search } }
      ]
    }),
    ...(from || to ? {
      date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59') })
      }
    } : {})
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where, orderBy: { date: 'desc' },
      skip: (page - 1) * perPage, take: perPage,
      include: { items: true, payments: true }
    }),
    prisma.transaction.count({ where })
  ])

  return NextResponse.json({
    success: true, data: transactions,
    meta: { page, per_page: perPage, total, pages: Math.ceil(total / perPage) }
  })
}
