import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { user_branch_access: true }
  })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })
  const branchId = dbUser.user_branch_access[0]?.branch_id

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    // 1. Today's Sales
    const todaysSales = await prisma.transaction.aggregate({
      where: {
        company_id: dbUser.company_id,
        type: 'SALES_INVOICE',
        status: { not: 'CANCELLED' },
        date: { gte: today, lt: tomorrow }
      },
      _sum: { total: true }
    })

    // 2. Today's Collection (amount_paid on invoices/transactions today)
    const todaysCollection = await prisma.transaction.aggregate({
      where: {
        company_id: dbUser.company_id,
        type: 'SALES_INVOICE',
        status: { not: 'CANCELLED' },
        date: { gte: today, lt: tomorrow }
      },
      _sum: { amount_paid: true }
    })

    // 3. Active Clients Count
    const clientsCount = await prisma.client.count({
      where: { company_id: dbUser.company_id, is_deleted: false }
    })

    // 4. Total Products
    const productsCount = await prisma.item.count({
      where: { company_id: dbUser.company_id, is_deleted: false }
    })

    // 5. Total Outstanding (total - amount_paid for all sales invoices)
    const outstandingAgg = await prisma.transaction.aggregate({
      where: {
        company_id: dbUser.company_id,
        type: 'SALES_INVOICE',
        status: { not: 'CANCELLED' }
      },
      _sum: {
        total: true,
        amount_paid: true
      }
    })
    const totalOutstanding = (outstandingAgg._sum.total || 0) - (outstandingAgg._sum.amount_paid || 0)

    // 6. Low Stock Count (reorder_level >= current stock)
    // First: calculate stock balance per item
    const inbound = await prisma.stockLedger.groupBy({
      by: ['item_id'],
      where: { company_id: dbUser.company_id, branch_id: branchId, type: 'IN' },
      _sum: { quantity: true }
    })
    const outbound = await prisma.stockLedger.groupBy({
      by: ['item_id'],
      where: { company_id: dbUser.company_id, branch_id: branchId, type: 'OUT' },
      _sum: { quantity: true }
    })

    const balanceMap: Record<string, number> = {}
    inbound.forEach(r => { balanceMap[r.item_id] = (r._sum.quantity || 0) })
    outbound.forEach(r => { balanceMap[r.item_id] = (balanceMap[r.item_id] || 0) - (r._sum.quantity || 0) })

    // Second: count items where stock <= reorder_level
    const items = await prisma.item.findMany({
      where: { company_id: dbUser.company_id, is_deleted: false }
    })
    let lowStockCount = 0
    items.forEach(item => {
      const stock = balanceMap[item.id] || 0
      const reorderLevel = item.reorder_level || 0
      if (stock <= reorderLevel) {
        lowStockCount++
      }
    })

    // 7. Recent Transactions (Sales Invoices & Purchase Bills)
    const recentTransactions = await prisma.transaction.findMany({
      where: { company_id: dbUser.company_id },
      orderBy: { date: 'desc' },
      take: 5
    })

    // 8. 7-Day Sales History (series of total sales per day)
    const last7days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      d.setHours(0, 0, 0, 0)
      
      const nextD = new Date(d)
      nextD.setDate(d.getDate() + 1)
      
      const dailySales = await prisma.transaction.aggregate({
        where: {
          company_id: dbUser.company_id,
          type: 'SALES_INVOICE',
          status: { not: 'CANCELLED' },
          date: { gte: d, lt: nextD }
        },
        _sum: { total: true }
      })
      
      last7days.push({
        date: d.toISOString().split('T')[0],
        sales: dailySales._sum.total || 0
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        todaysSales: todaysSales._sum.total || 0,
        todaysCollection: todaysCollection._sum.amount_paid || 0,
        clientsCount,
        productsCount,
        totalOutstanding,
        lowStockCount,
        recentTransactions,
        last7days
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
