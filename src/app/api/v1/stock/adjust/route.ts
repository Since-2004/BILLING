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
  const branchId = dbUser.user_branch_access[0]?.branch_id

  const body = await request.json()
  // body: { item_id, type: 'IN'|'OUT', quantity, reason }
  try {
    const entry = await prisma.stockLedger.create({
      data: {
        company_id: dbUser.company_id,
        branch_id: branchId!,
        item_id: body.item_id,
        type: body.type,
        quantity: Number(body.quantity),
        date: new Date(),
        remarks: body.reason || 'Manual adjustment',
        created_by: user.id
      }
    })
    return NextResponse.json({ success: true, data: entry })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
