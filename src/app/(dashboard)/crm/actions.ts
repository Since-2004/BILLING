'use server'

import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getClients() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  return prisma.client.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    include: { branch: true, product_prices: true },
    orderBy: { name: 'asc' }
  })
}

export async function getBranches() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  return prisma.branch.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })
}

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
    orderBy: { name: 'asc' }
  })
}

export async function createClientRecord(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  // Extract custom product prices
  const productPrices: { item_id: string, price: number }[] = []
  for (const key of Object.keys(data)) {
    if (key.startsWith('product_price_')) {
      const itemId = key.replace('product_price_', '')
      const priceStr = data[key]
      if (priceStr && priceStr.trim() !== '') {
        const price = Math.round(parseFloat(priceStr) * 100) // Convert Rs to paise
        if (!isNaN(price) && price >= 0) {
          productPrices.push({ item_id: itemId, price })
        }
      }
    }
  }

  const client = await prisma.client.create({
    data: {
      company_id: dbUser.company_id,
      branch_id: data.branch_id || null,
      name: data.name,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      address: data.address,
      state_code: data.state_code,
      client_type: data.client_type || 'RETAIL',
      opening_balance: data.opening_balance ? Math.round(parseFloat(data.opening_balance) * 100) : 0,
      credit_limit: data.credit_limit ? parseInt(data.credit_limit) : 0,
      created_by: user.id,
      product_prices: {
        createMany: {
          data: productPrices.map(pp => ({
            item_id: pp.item_id,
            price: pp.price
          }))
        }
      }
    },
    include: { branch: true, product_prices: true }
  })

  revalidatePath('/crm/clients')
  return client
}

export async function getSuppliers() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  return prisma.supplier.findMany({
    where: { company_id: dbUser.company_id, is_deleted: false },
    orderBy: { created_at: 'desc' }
  })
}

export async function createSupplierRecord(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  const supplier = await prisma.supplier.create({
    data: {
      company_id: dbUser.company_id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      address: data.address,
      state_code: data.state_code,
      created_by: user.id
    }
  })

  revalidatePath('/crm/suppliers')
  return supplier
}

export async function updateClientRecord(clientId: string, data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  // Extract custom product prices
  const productPrices: { item_id: string, price: number }[] = []
  for (const key of Object.keys(data)) {
    if (key.startsWith('product_price_')) {
      const itemId = key.replace('product_price_', '')
      const priceStr = data[key]
      if (priceStr && priceStr.trim() !== '') {
        const price = Math.round(parseFloat(priceStr) * 100) // Convert Rs to paise
        if (!isNaN(price) && price >= 0) {
          productPrices.push({ item_id: itemId, price })
        }
      }
    }
  }

  const client = await prisma.client.update({
    where: {
      id: clientId,
      company_id: dbUser.company_id
    },
    data: {
      branch_id: data.branch_id || null,
      name: data.name,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      address: data.address,
      state_code: data.state_code,
      client_type: data.client_type || 'RETAIL',
      opening_balance: data.opening_balance ? Math.round(parseFloat(data.opening_balance) * 100) : 0,
      credit_limit: data.credit_limit ? parseInt(data.credit_limit) : 0
    },
    include: { branch: true }
  })

  // Delete old prices and insert new ones
  await prisma.clientProductPrice.deleteMany({
    where: { client_id: clientId }
  })

  if (productPrices.length > 0) {
    await prisma.clientProductPrice.createMany({
      data: productPrices.map(pp => ({
        client_id: clientId,
        item_id: pp.item_id,
        price: pp.price
      }))
    })
  }

  // Fetch updated client with prices to return
  const updatedClient = await prisma.client.findUnique({
    where: { id: clientId },
    include: { branch: true, product_prices: true }
  })

  revalidatePath('/crm/clients')
  return updatedClient
}

export async function deleteClientRecord(clientId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('Company not found')

  const client = await prisma.client.update({
    where: {
      id: clientId,
      company_id: dbUser.company_id
    },
    data: { is_deleted: true }
  })

  revalidatePath('/crm/clients')
  return client
}
