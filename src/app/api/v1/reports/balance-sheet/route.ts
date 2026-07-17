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
  const asOf = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

  // Assets = cash + bank + debtors (unpaid invoices)
  const totalSales = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { company_id: dbUser.company_id, type: 'SALES_INVOICE', date: { lte: asOf } }
  })
  const totalReceived = await prisma.transaction.aggregate({
    _sum: { amount_paid: true },
    where: { company_id: dbUser.company_id, type: 'SALES_INVOICE', date: { lte: asOf } }
  })
  const totalPurchases = await prisma.transaction.aggregate({
    _sum: { total: true },
    where: { company_id: dbUser.company_id, type: 'PURCHASE_BILL', date: { lte: asOf } }
  })
  const totalPaid = await prisma.transaction.aggregate({
    _sum: { amount_paid: true },
    where: { company_id: dbUser.company_id, type: 'PURCHASE_BILL', date: { lte: asOf } }
  })

  const debtors = (totalSales._sum.total || 0) - (totalReceived._sum.amount_paid || 0)
  const creditors = (totalPurchases._sum.total || 0) - (totalPaid._sum.amount_paid || 0)
  const cashInHand = (totalReceived._sum.amount_paid || 0) - (totalPaid._sum.amount_paid || 0)

  // Stock valuation using active stock balance (IN quantity - OUT quantity) per item
  const inbound = await prisma.stockLedger.groupBy({
    by: ['item_id'],
    where: { company_id: dbUser.company_id, type: 'IN', date: { lte: asOf } },
    _sum: { quantity: true }
  })
  
  const outbound = await prisma.stockLedger.groupBy({
    by: ['item_id'],
    where: { company_id: dbUser.company_id, type: 'OUT', date: { lte: asOf } },
    _sum: { quantity: true }
  })

  const items = await prisma.item.findMany({
    where: { company_id: dbUser.company_id },
    select: { id: true, purchase_price: true }
  })

  const balanceMap: Record<string, number> = {}
  inbound.forEach(r => { balanceMap[r.item_id] = (r._sum.quantity || 0) })
  outbound.forEach(r => { balanceMap[r.item_id] = (balanceMap[r.item_id] || 0) - (r._sum.quantity || 0) })

  let totalStockValue = 0
  items.forEach(item => {
    const qty = balanceMap[item.id] || 0
    if (qty > 0) {
      totalStockValue += qty * (item.purchase_price || 0)
    }
  })

  const totalAssets = debtors + cashInHand + totalStockValue

  return NextResponse.json({
    success: true,
    data: {
      assets: {
        cash_in_hand: cashInHand,
        debtors,
        stock_value: totalStockValue,
        total: totalAssets
      },
      liabilities: {
        creditors,
        total: creditors
      },
      equity: {
        retained_earnings: totalAssets - creditors,
        total: totalAssets - creditors
      },
      as_of: asOf
    }
  })
}
