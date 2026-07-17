import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const suppliers = await prisma.supplier.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })

  return NextResponse.json({ success: true, data: suppliers })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()

  try {
    const supplier = await prisma.supplier.create({
      data: {
        company_id: dbUser.company_id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        gstin: body.gstin,
        address: body.address,
        created_by: user.id
      }
    })
    return NextResponse.json({ success: true, data: supplier })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
