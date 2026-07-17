import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const ledger = await prisma.stockLedger.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { date: 'desc' }
  })

  // To build an aggregated view per item, you would ideally group by item_id
  // but for simplicity, we return the raw ledger entries and handle on frontend
  
  return NextResponse.json({ success: true, data: ledger })
}
