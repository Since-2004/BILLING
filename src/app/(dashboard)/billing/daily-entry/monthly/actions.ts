'use server'

import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function getMonthlyDailyEntries(monthStr: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })
    if (!dbUser?.company_id) throw new Error('No company found')

    // Parse monthStr like '2026-06'
    const [year, month] = monthStr.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    
    // Calculate the end date as the 1st of the next month
    const endDate = new Date(year, month, 1)

    // Fetch all sales invoices for this month
    const transactions = await prisma.transaction.findMany({
      where: {
        company_id: dbUser.company_id,
        type: 'SALES_INVOICE',
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      orderBy: { date: 'asc' },
      include: {
        items: true,
        payments: true,
        branch: true
      }
    })

    // Fetch all consolidated invoices for this month
    const consolidatedInvoices = await prisma.transaction.findMany({
      where: {
        company_id: dbUser.company_id,
        type: 'CONSOLIDATED_INVOICE',
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        items: true,
        payments: true
      }
    })

    // Fetch company profile & inventory items for smart item inferencing
    const company = await prisma.company.findUnique({
      where: { id: dbUser.company_id }
    })
    const inventoryItems = await prisma.item.findMany({
      where: { company_id: dbUser.company_id }
    })

    // Calculate next invoice number
    const fyStart = startDate.getMonth() >= 3
      ? new Date(startDate.getFullYear(), 3, 1)
      : new Date(startDate.getFullYear() - 1, 3, 1)
    const fyEnd = new Date(fyStart.getFullYear() + 1, 3, 1)
    const fyShort = `${fyStart.getFullYear()}-${String(fyEnd.getFullYear() % 100).padStart(2, '0')}`
    const prefix = `INV/C/${fyShort}/`

    const lastTx = await prisma.transaction.findFirst({
      where: {
        company_id: dbUser.company_id,
        type: 'CONSOLIDATED_INVOICE',
        date: { gte: fyStart, lt: fyEnd }
      },
      orderBy: {
        transaction_no: 'desc'
      }
    })

    let nextNumber = 1
    if (lastTx) {
      const lastSlashIdx = lastTx.transaction_no.lastIndexOf('/')
      if (lastSlashIdx !== -1) {
        const lastNumStr = lastTx.transaction_no.substring(lastSlashIdx + 1)
        const lastNum = parseInt(lastNumStr, 10)
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1
        }
      }
    }
    const nextInvoiceNo = `${prefix}${String(nextNumber).padStart(5, '0')}`

    return {
      success: true,
      data: JSON.parse(JSON.stringify(transactions)),
      consolidatedInvoices: JSON.parse(JSON.stringify(consolidatedInvoices)),
      nextInvoiceNo,
      company: JSON.parse(JSON.stringify(company)),
      inventoryItems: JSON.parse(JSON.stringify(inventoryItems))
    }
  } catch (error: any) {
    console.error('Failed to get monthly sales:', error)
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function saveConsolidatedInvoice(data: {
  monthStr: string
  partyName: string
  partyId?: string | null
  subtotal: number
  discount: number
  taxAmount: number
  total: number
  branchId: string
  items: Array<{
    item_id?: string | null
    item_name: string
    quantity: number
    rate: number
    discount: number
    tax_rate: number
    tax_amount: number
    total: number
  }>
}) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })
    if (!dbUser?.company_id) throw new Error('No company found')

    const [year, month] = data.monthStr.split('-').map(Number)
    // Date of consolidated invoice is the last day of the selected month
    const invoiceDate = new Date(year, month, 0)

    const fyStart = invoiceDate.getMonth() >= 3
      ? new Date(invoiceDate.getFullYear(), 3, 1)
      : new Date(invoiceDate.getFullYear() - 1, 3, 1)
    const fyEnd = new Date(fyStart.getFullYear() + 1, 3, 1)
    const fyShort = `${fyStart.getFullYear()}-${String(fyEnd.getFullYear() % 100).padStart(2, '0')}`
    const prefix = `INV/C/${fyShort}/`

    const lastTx = await prisma.transaction.findFirst({
      where: {
        company_id: dbUser.company_id,
        type: 'CONSOLIDATED_INVOICE',
        date: { gte: fyStart, lt: fyEnd }
      },
      orderBy: {
        transaction_no: 'desc'
      }
    })

    let nextNumber = 1
    if (lastTx) {
      const lastSlashIdx = lastTx.transaction_no.lastIndexOf('/')
      if (lastSlashIdx !== -1) {
        const lastNumStr = lastTx.transaction_no.substring(lastSlashIdx + 1)
        const lastNum = parseInt(lastNumStr, 10)
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1
        }
      }
    }
    const transactionNo = `${prefix}${String(nextNumber).padStart(5, '0')}`

    const newTx = await prisma.transaction.create({
      data: {
        company_id: dbUser.company_id!,
        branch_id: data.branchId,
        type: 'CONSOLIDATED_INVOICE',
        transaction_no: transactionNo,
        date: invoiceDate,
        party_id: data.partyId || null,
        party_name: data.partyName,
        subtotal: data.subtotal,
        discount: data.discount,
        tax_amount: data.taxAmount,
        total: data.total,
        amount_paid: data.total, // Fully paid by default
        status: 'PAID',
        notes: `Consolidated Invoice for ${data.monthStr}`,
        items: {
          create: data.items.map(item => ({
            item_id: item.item_id || null,
            item_name: item.item_name,
            quantity: item.quantity,
            rate: item.rate,
            discount: item.discount,
            tax_rate: item.tax_rate,
            tax_amount: item.tax_amount,
            total: item.total
          }))
        },
        payments: {
          create: [{
            mode: 'CASH',
            amount: data.total
          }]
        }
      }
    })

    return { success: true, data: JSON.parse(JSON.stringify(newTx)) }
  } catch (error: any) {
    console.error('Failed to save consolidated invoice:', error)
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function getConsolidatedInvoiceForEdit(id: string) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })
    if (!dbUser?.company_id) throw new Error('No company found')

    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        branch: true
      }
    })
    
    if (!tx || tx.company_id !== dbUser.company_id) {
      throw new Error('Invoice not found')
    }

    const company = await prisma.company.findUnique({
      where: { id: dbUser.company_id }
    })

    return {
      success: true,
      data: JSON.parse(JSON.stringify(tx)),
      company: JSON.parse(JSON.stringify(company))
    }
  } catch (error: any) {
    console.error('Failed to get consolidated invoice for edit:', error)
    return { success: false, error: error.message || 'Server error' }
  }
}

export async function updateConsolidatedInvoice(
  id: string,
  data: {
    subtotal: number
    taxAmount: number
    total: number
    items: Array<{
      item_id?: string | null
      item_name: string
      quantity: number
      rate: number
      discount: number
      tax_rate: number
      tax_amount: number
      total: number
    }>
  }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })
    if (!dbUser?.company_id) throw new Error('No company found')

    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, company_id: dbUser.company_id! }
      })
      if (!oldTx) throw new Error('Invoice not found')

      // Recreate items
      await tx.transactionItem.deleteMany({ where: { transaction_id: id } })

      await tx.transaction.update({
        where: { id },
        data: {
          subtotal: data.subtotal,
          tax_amount: data.taxAmount,
          total: data.total,
          amount_paid: data.total, // Re-sync payment amount
          items: {
            create: data.items.map(item => ({
              item_id: item.item_id || null,
              item_name: item.item_name,
              quantity: item.quantity,
              rate: item.rate,
              discount: item.discount,
              tax_rate: item.tax_rate,
              tax_amount: item.tax_amount,
              total: item.total
            }))
          },
          payments: {
            deleteMany: {}, // Delete old payments
            create: [{
              mode: 'CASH',
              amount: data.total
            }]
          }
        }
      })
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to update consolidated invoice:', error)
    return { success: false, error: error.message || 'Server error' }
  }
}
