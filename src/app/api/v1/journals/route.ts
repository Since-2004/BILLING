import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const journals = await prisma.journalEntry.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { date: 'desc' },
    include: {
      lines: {
        include: { account: true }
      }
    }
  })

  return NextResponse.json({ success: true, data: journals })
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

  // Validate Double Entry Rule (Total Debits == Total Credits)
  const totalDebit = body.lines.reduce((acc: number, line: any) => acc + (Number(line.debit) || 0), 0)
  const totalCredit = body.lines.reduce((acc: number, line: any) => acc + (Number(line.credit) || 0), 0)

  if (totalDebit !== totalCredit) {
    return NextResponse.json({ error: 'Debits must equal credits' }, { status: 400 })
  }

  try {
    const journal = await prisma.journalEntry.create({
      data: {
        company_id: dbUser.company_id,
        branch_id: branchId,
        date: new Date(body.date || Date.now()),
        reference: body.reference,
        narration: body.narration,
        created_by: user.id,
        lines: {
          create: body.lines.map((line: any) => ({
            account_id: line.account_id,
            debit: Number(line.debit) || 0,
            credit: Number(line.credit) || 0
          }))
        }
      },
      include: { lines: true }
    })
    return NextResponse.json({ success: true, data: journal })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
