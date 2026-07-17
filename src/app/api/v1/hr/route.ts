import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const attendance = await prisma.attendance.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { date: 'desc' }
  })

  return NextResponse.json({ success: true, data: attendance })
}

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
  if (!branchId) return NextResponse.json({ error: 'No branch access' }, { status: 403 })

  const body = await request.json()

  try {
    if (body.action === 'CLOCK_IN') {
      const record = await prisma.attendance.create({
        data: {
          company_id: dbUser.company_id,
          branch_id: branchId,
          user_id: user.id,
          date: new Date(),
          clock_in: new Date(),
          status: 'PRESENT'
        }
      })
      return NextResponse.json({ success: true, data: record })
    }

    if (body.action === 'CLOCK_OUT') {
      const record = await prisma.attendance.update({
        where: { id: body.attendance_id },
        data: { clock_out: new Date() }
      })
      return NextResponse.json({ success: true, data: record })
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
