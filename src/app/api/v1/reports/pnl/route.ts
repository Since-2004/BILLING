import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(new Date().getFullYear(), 3, 1)
  const to = searchParams.get('to') ? new Date(searchParams.get('to') + 'T23:59:59') : new Date()

  try {
    const [sales, purchases, returns] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { subtotal: true, tax_amount: true, total: true, discount: true },
        where: { company_id: dbUser.company_id, type: 'SALES_INVOICE', status: { not: 'CANCELLED' }, date: { gte: from, lte: to } }
      }),
      prisma.transaction.aggregate({
        _sum: { subtotal: true, tax_amount: true, total: true },
        where: { company_id: dbUser.company_id, type: 'PURCHASE_BILL', status: { not: 'CANCELLED' }, date: { gte: from, lte: to } }
      }),
      prisma.transaction.aggregate({
        _sum: { total: true },
        where: { company_id: dbUser.company_id, type: 'SALES_RETURN', status: { not: 'CANCELLED' }, date: { gte: from, lte: to } }
      })
    ])

    // Monthly breakdown for chart
    const chartTransactions = await prisma.transaction.findMany({
      where: {
        company_id: dbUser.company_id,
        status: { not: 'CANCELLED' },
        date: { gte: from, lte: to },
        type: { in: ['SALES_INVOICE', 'PURCHASE_BILL'] }
      },
      select: {
        date: true,
        type: true,
        total: true
      }
    })

    const monthlyGroups: Record<string, { month: string; sales: number; purchases: number }> = {}
    chartTransactions.forEach(tx => {
      const dateObj = new Date(tx.date)
      const monthStr = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toISOString()
      if (!monthlyGroups[monthStr]) {
        monthlyGroups[monthStr] = { month: monthStr, sales: 0, purchases: 0 }
      }
      if (tx.type === 'SALES_INVOICE') {
        monthlyGroups[monthStr].sales += tx.total
      } else if (tx.type === 'PURCHASE_BILL') {
        monthlyGroups[monthStr].purchases += tx.total
      }
    })
    const monthlyData = Object.values(monthlyGroups).sort((a, b) => a.month.localeCompare(b.month))

    const totalSales = (sales._sum.total || 0) - (returns._sum.total || 0)
    const totalPurchases = purchases._sum.total || 0
    const grossProfit = totalSales - totalPurchases
    const taxCollected = sales._sum.tax_amount || 0
    const taxPaid = purchases._sum.tax_amount || 0

    return NextResponse.json({
      success: true,
      data: {
        totalSales, totalPurchases, grossProfit,
        totalReturns: returns._sum.total || 0,
        totalDiscount: sales._sum.discount || 0,
        taxCollected, taxPaid, netTaxLiability: taxCollected - taxPaid,
        monthlyData
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
