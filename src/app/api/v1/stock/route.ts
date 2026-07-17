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
  
  const { searchParams } = new URL(request.url)
  const branchId = searchParams.get('branch_id') || dbUser.user_branch_access[0]?.branch_id

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

  return NextResponse.json({ success: true, data: balanceMap })
}

export async function POST(request: Request) {
  // Stock adjustment: { item_id, type: 'IN'|'OUT', quantity, reason }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { user_branch_access: true }
  })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()
  const branchId = body.branch_id || dbUser.user_branch_access[0]?.branch_id
  try {
    const entry = await prisma.stockLedger.create({
      data: {
        company_id: dbUser.company_id,
        branch_id: branchId!,
        item_id: body.item_id,
        type: body.type,
        quantity: Number(body.quantity),
        date: new Date(),
        remarks: body.reason || 'Manual adjustment'
      }
    })
    return NextResponse.json({ success: true, data: entry })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
