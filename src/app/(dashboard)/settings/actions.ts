'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateCompanyProfile(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const updated = await prisma.company.update({
    where: { id: dbUser.company_id },
    data: {
      name: data.name,
      gstin: data.gstin,
      address: data.address,
      state_code: data.state_code,
      billing_mode: data.billing_mode,
      logo_url: data.logo_url,
      owner_name: data.owner_name,
      financial_year_start: data.financial_year_start ? new Date(data.financial_year_start) : undefined,
      invoice_use_branch_name: data.invoice_use_branch_name !== undefined ? Boolean(data.invoice_use_branch_name) : undefined
    }
  })

  // Sync owner's user name in the User table if owner_name is updated
  if (data.owner_name) {
    await prisma.user.updateMany({
      where: {
        company_id: dbUser.company_id,
        role: 'OWNER'
      },
      data: {
        name: data.owner_name
      }
    })
  }

  revalidatePath('/settings')
  return { success: true, data: updated }
}

export async function addBranch(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const branch = await prisma.branch.create({
    data: {
      company_id: dbUser.company_id,
      name: data.name,
      address: data.address,
      gstin: data.gstin,
      phone: data.phone || null,
      bank_name: data.bank_name || null,
      bank_account_no: data.bank_account_no || null,
      bank_ifsc: data.bank_ifsc || null,
      bank_branch: data.bank_branch || null,
      digital_sign_url: data.digital_sign_url || null
    }
  })

  // Also give the creator access to this new branch
  await prisma.userBranchAccess.create({
    data: {
      user_id: user.id,
      branch_id: branch.id
    }
  })

  revalidatePath('/settings')
  return { success: true, data: branch }
}

export async function updateBranch(branchId: string, data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const branch = await prisma.branch.update({
    where: {
      id: branchId,
      company_id: dbUser.company_id
    },
    data: {
      name: data.name,
      address: data.address,
      gstin: data.gstin,
      phone: data.phone || null,
      bank_name: data.bank_name || null,
      bank_account_no: data.bank_account_no || null,
      bank_ifsc: data.bank_ifsc || null,
      bank_branch: data.bank_branch || null,
      digital_sign_url: data.digital_sign_url || null
    }
  })

  revalidatePath('/settings')
  return { success: true, data: branch }
}

export async function getCompanyData() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) return null

  const company = await prisma.company.findUnique({
    where: { id: dbUser.company_id },
    include: {
      branches: true
    }
  })

  return company
}

export async function getUsers() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) return []

  const users = await prisma.user.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { created_at: 'asc' }
  })

  return users
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if current user is OWNER or ADMIN
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true, role: true }
  })

  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) {
    throw new Error('You do not have permission to change roles.')
  }

  const updatedUser = await prisma.user.update({
    where: { 
      id: userId,
      company_id: currentUser.company_id! // Ensure they are in the same company
    },
    data: { role }
  })

  revalidatePath('/settings/users')
  return { success: true, data: updatedUser }
}
