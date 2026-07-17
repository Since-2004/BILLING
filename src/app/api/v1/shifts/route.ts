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
  if (!branchId) return NextResponse.json({ error: 'No branch access' }, { status: 403 })

  const body = await request.json()

  try {
    if (body.action === 'OPEN') {
      const shift = await prisma.shift.create({
        data: {
          company_id: dbUser.company_id,
          branch_id: branchId,
          user_id: user.id,
          opening_cash: Math.round(Number(body.opening_cash) * 100) || 0
        }
      })
      return NextResponse.json({ success: true, data: shift })
    } 
    
    if (body.action === 'CLOSE') {
      const shift = await prisma.shift.update({
        where: { id: body.shift_id },
        data: {
          end_time: new Date(),
          closing_cash: Math.round(Number(body.closing_cash) * 100) || 0,
          status: 'CLOSED'
        }
      })
      return NextResponse.json({ success: true, data: shift })
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shifts = await prisma.shift.findMany({
    where: { user_id: user.id },
    orderBy: { start_time: 'desc' }
  })

  return NextResponse.json({ success: true, data: shifts })
}
