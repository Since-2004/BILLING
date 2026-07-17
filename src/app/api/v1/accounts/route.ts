import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const accounts = await prisma.account.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { type: 'asc' }
  })

  return NextResponse.json({ success: true, data: accounts })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()

  try {
    const account = await prisma.account.create({
      data: {
        company_id: dbUser.company_id,
        name: body.name,
        type: body.type,
        code: body.code
      }
    })
    return NextResponse.json({ success: true, data: account })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
