import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const body = await request.json()
  try {
    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        name: body.name,
        code: body.code || null,
        barcode: body.barcode || null,
        hsn_code: body.hsn_code || null,
        item_type: body.item_type || "PRODUCT",
        sale_price_1: Math.round(Number(body.sale_price_1) * 100),
        purchase_price: Math.round(Number(body.purchase_price) * 100),
        mrp: body.mrp ? Math.round(Number(body.mrp) * 100) : null,
        tax_rate: Number(body.tax_rate) || 0,
        reorder_level: Number(body.reorder_level) || 0,
      }
    })
    return NextResponse.json({ success: true, data: item })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  try {
    await prisma.item.update({
      where: { id: params.id },
      data: { is_deleted: true }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
