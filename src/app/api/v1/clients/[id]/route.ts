import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 400 })

  try {
    const client = await prisma.client.findFirst({
      where: { id: params.id, company_id: dbUser.company_id, is_deleted: false },
      include: { branch: true, product_prices: true }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Get all transactions for this client
    const transactions = await prisma.transaction.findMany({
      where: {
        company_id: dbUser.company_id,
        party_id: params.id,
      },
      include: { items: true, payments: true },
      orderBy: { date: 'desc' }
    })

    // Calculate outstanding (invoice total - amount paid + opening balance)
    const invoices = transactions.filter(t => t.type === 'SALES_INVOICE' && t.status !== 'CANCELLED')
    const totalInvoiced = invoices.reduce((acc, i) => acc + i.total, 0)
    const totalPaid = invoices.reduce((acc, i) => acc + i.amount_paid, 0)
    const openingBalance = client.opening_balance || 0
    const outstanding = totalInvoiced - totalPaid + openingBalance

    // Ageing buckets (reused from outstanding report)
    const today = new Date()
    let bucket0to30 = 0, bucket31to60 = 0, bucket61to90 = 0, bucket90plus = openingBalance
    invoices.forEach(inv => {
      const balance = inv.total - inv.amount_paid
      if (balance <= 0) return
      const days = Math.floor((today.getTime() - new Date(inv.date).getTime()) / 86400000)
      if (days <= 30) bucket0to30 += balance
      else if (days <= 60) bucket31to60 += balance
      else if (days <= 90) bucket61to90 += balance
      else bucket90plus += balance
    })

    return NextResponse.json({
      success: true,
      data: {
        client,
        transactions,
        summary: {
          totalInvoiced,
          totalPaid,
          outstanding,
          openingBalance,
          ageing: {
            bucket0to30,
            bucket31to60,
            bucket61to90,
            bucket90plus
          }
        }
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company found' }, { status: 400 })

  try {
    const client = await prisma.client.update({
      where: { id: params.id, company_id: dbUser.company_id },
      data: { is_deleted: true }
    })
    return NextResponse.json({ success: true, data: client })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
