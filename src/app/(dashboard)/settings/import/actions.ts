'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function importData(type: string, data: any[]) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const company_id = dbUser.company_id

  try {
    if (type === 'ITEMS') {
      const items = data.map(row => ({
        company_id,
        name: row['Item Name'] || row.name,
        sku: row['SKU'] || row.sku,
        description: row['Description'] || row.description,
        type: 'PRODUCT',
        purchase_price: Math.round(Number(row['Purchase Price'] || row.purchase_price || 0) * 100),
        sale_price: Math.round(Number(row['Sale Price'] || row.sale_price || 0) * 100),
        tax_rate: Number(row['Tax Rate'] || row.tax_rate || 0),
        track_inventory: true
      })).filter(i => i.name) // only valid rows

      await prisma.item.createMany({
        data: items
      })
      revalidatePath('/inventory')
    } else if (type === 'CONTACTS') {
      const clients = data.filter(r => r['Type']?.toUpperCase() === 'CLIENT' || r.type?.toUpperCase() === 'CLIENT').map(row => ({
        company_id,
        name: row['Name'] || row.name,
        email: row['Email'] || row.email,
        phone: row['Phone'] || row.phone,
        address: row['Address'] || row.address,
        gstin: row['GSTIN'] || row.gstin,
        opening_balance: 0
      })).filter(c => c.name)

      const suppliers = data.filter(r => r['Type']?.toUpperCase() === 'SUPPLIER' || r.type?.toUpperCase() === 'SUPPLIER').map(row => ({
        company_id,
        name: row['Name'] || row.name,
        email: row['Email'] || row.email,
        phone: row['Phone'] || row.phone,
        address: row['Address'] || row.address,
        gstin: row['GSTIN'] || row.gstin,
        opening_balance: 0
      })).filter(c => c.name)

      if (clients.length > 0) {
        await prisma.client.createMany({
          data: clients
        })
        revalidatePath('/crm/clients')
      }
      
      if (suppliers.length > 0) {
        await prisma.supplier.createMany({
          data: suppliers
        })
        revalidatePath('/crm/suppliers')
      }
    }

    return { success: true, count: data.length }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
