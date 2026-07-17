'use server'

import prisma from '@/lib/prisma'

export async function createCompany(formData: FormData) {
  try {
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const gstin = formData.get('gstin') as string || null
    const state_code = formData.get('state_code') as string || null
    const address = formData.get('address') as string || null

    if (!name || !userId) {
      return { error: 'Company Name is required' }
    }

    // Wrap in transaction: create company, create branch, assign user
    await prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name,
          gstin,
          state_code,
          address,
          created_by: userId
        }
      })

      // 2. Create default branch
      const branch = await tx.branch.create({
        data: {
          company_id: company.id,
          name: 'Head Office',
          address,
          gstin,
          is_default: true,
          created_by: userId
        }
      })

      // 3. Update user
      await tx.user.update({
        where: { id: userId },
        data: {
          company_id: company.id,
        }
      })

      // 4. Give user access to branch
      await tx.userBranchAccess.create({
        data: {
          user_id: userId,
          branch_id: branch.id
        }
      })
    })

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Something went wrong' }
  }
}
