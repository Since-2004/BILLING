'use server'

import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTransactionPayment(transactionId: string, amountPaise: number, paymentMode: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })
    if (!dbUser?.company_id) throw new Error('No company found')

    // Find original transaction
    const tx = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { payments: true }
    })

    if (!tx) throw new Error('Transaction not found')

    const remainingBalance = tx.total - tx.amount_paid
    if (amountPaise > remainingBalance) {
      throw new Error(`Amount exceeds remaining balance of ${remainingBalance / 100}`)
    }

    const updatedAmountPaid = tx.amount_paid + amountPaise

    // Create payment and update transaction status/amount paid inside a transaction block
    const updatedTx = await prisma.$transaction(async (prismaTx) => {
      // 1. Create TransactionPayment
      await prismaTx.transactionPayment.create({
        data: {
          transaction_id: transactionId,
          mode: paymentMode,
          amount: amountPaise
        }
      })

      // 2. Update Transaction
      const updated = await prismaTx.transaction.update({
        where: { id: transactionId },
        data: {
          amount_paid: updatedAmountPaid,
          status: updatedAmountPaid >= tx.total ? 'PAID' : 'PENDING'
        }
      })

      // 3. Create double-entry journal lines for the payment receipt
      // Debits Cash (or Cash in Hand) and Credits Party Account (or Customer Accounts)
      const cashAccount = await prismaTx.account.findFirst({
        where: { company_id: dbUser.company_id!, name: 'Cash in Hand' }
      })
      
      const partyAccount = await prismaTx.account.findFirst({
        where: { company_id: dbUser.company_id!, name: tx.party_name || 'Walk-in/Cash Party' }
      })

      if (cashAccount && partyAccount) {
        await prismaTx.journalEntry.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: tx.branch_id,
            date: new Date(),
            reference: tx.id,
            narration: `Payment receipt of ${amountPaise / 100} for ${tx.transaction_no}`,
            lines: {
              create: [
                { account_id: cashAccount.id, debit: amountPaise, credit: 0 },
                { account_id: partyAccount.id, debit: 0, credit: amountPaise }
              ]
            }
          }
        })
      }

      return updated
    })

    revalidatePath('/invoices')
    return { success: true, data: JSON.parse(JSON.stringify(updatedTx)) }
  } catch (error: any) {
    console.error('Failed to log payment:', error)
    return { success: false, error: error.message || 'Server error' }
  }
}
