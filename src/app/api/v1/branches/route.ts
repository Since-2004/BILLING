import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's company
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  })

  if (!dbUser?.company_id) {
    return NextResponse.json({ error: 'No company found' }, { status: 400 })
  }

  const branches = await prisma.branch.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })

  return NextResponse.json({ success: true, data: branches })
}
