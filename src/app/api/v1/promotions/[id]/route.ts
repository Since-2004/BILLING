import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const scheme = await prisma.discountScheme.update({
    where: { id: params.id },
    data: { is_active: body.is_active }
  })
  return NextResponse.json({ success: true, data: scheme })
}
