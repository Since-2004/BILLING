'use server'

import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getItems() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  return prisma.item.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })
}

export async function createItemRecord(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  const item = await prisma.item.create({
    data: {
      company_id: dbUser.company_id,
      name: data.name,
      code: data.code || null,
      barcode: data.barcode || null,
      hsn_code: data.hsn_code || null,
      item_type: data.item_type || "PRODUCT",
      purchase_price: data.purchase_price ? Math.round(parseFloat(data.purchase_price) * 100) : 0,
      sale_price_1: data.sale_price_1 ? Math.round(parseFloat(data.sale_price_1) * 100) : 0,
      mrp: data.mrp ? Math.round(parseFloat(data.mrp) * 100) : null,
      tax_rate: data.tax_rate ? parseFloat(data.tax_rate) : 0,
      reorder_level: data.reorder_level ? parseInt(data.reorder_level) : 0,
      created_by: user.id
    }
  })

  revalidatePath('/inventory')
  return item
}
