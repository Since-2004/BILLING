import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const schemes = await prisma.discountScheme.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json({ success: true, data: schemes })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()
  try {
    const scheme = await prisma.discountScheme.create({
      data: {
        company_id: dbUser.company_id,
        name: body.name,
        type: body.type || 'BILL',
        discount_value: body.is_percentage === 'true'
          ? Number(body.discount_value)
          : Math.round(Number(body.discount_value) * 100),
        is_percentage: body.is_percentage === 'true',
        min_bill_value: body.min_bill_value ? Math.round(Number(body.min_bill_value) * 100) : 0,
        start_date: body.start_date ? new Date(body.start_date) : null,
        end_date: body.end_date ? new Date(body.end_date) : null,
        is_active: true,
        created_by: user.id
      }
    })
    return NextResponse.json({ success: true, data: scheme })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
