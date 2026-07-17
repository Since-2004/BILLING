import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })
  const companyId = dbUser.company_id as string

  try {
    const clients = await prisma.client.findMany({
      where: { company_id: companyId, is_deleted: false }
    })

    const today = new Date()
    const result = await Promise.all(clients.map(async client => {
      const invoices = await prisma.transaction.findMany({
        where: { company_id: companyId, party_id: client.id, type: 'SALES_INVOICE', status: { not: 'CANCELLED' } },
        select: { total: true, amount_paid: true, date: true }
      })
      const totalInvoiced = invoices.reduce((acc, i) => acc + i.total, 0)
      const totalPaid = invoices.reduce((acc, i) => acc + i.amount_paid, 0)
      const openingBalance = client.opening_balance || 0
      const outstanding = totalInvoiced - totalPaid + openingBalance

      // Ageing — bucket unpaid invoices by how old they are
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

      return { id: client.id, name: client.name, totalInvoiced, totalPaid, outstanding, bucket0to30, bucket31to60, bucket61to90, bucket90plus }
    }))

    return NextResponse.json({
      success: true,
      data: result.filter(c => c.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding)
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
