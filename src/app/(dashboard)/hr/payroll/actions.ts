'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getPayrollRecords() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const records = await prisma.payroll.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: [{ year: 'desc' }, { month: 'desc' }]
  })

  return records
}

export async function generateSalarySlip(data: any) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const basic_salary = Math.round(Number(data.basic_salary) * 100) || 0
  const allowances = Math.round(Number(data.allowances) * 100) || 0
  const deductions = Math.round(Number(data.deductions) * 100) || 0
  const net_payable = basic_salary + allowances - deductions

  const record = await prisma.payroll.create({
    data: {
      company_id: dbUser.company_id,
      user_id: user.id, // For now, assign to current user as MVP
      month: Number(data.month),
      year: Number(data.year),
      basic_salary,
      allowances,
      deductions,
      net_payable,
      status: 'PAID'
    }
  })

  // We should ideally create Journal Entry for Salary Expense, but MVP skips it
  revalidatePath('/hr/payroll')
  return { success: true, data: record }
}
