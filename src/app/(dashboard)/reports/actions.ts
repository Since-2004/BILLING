'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function getProfitAndLoss(startDate?: Date, endDate?: Date) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })

  if (!dbUser?.company_id) throw new Error('No company found')

  // Date filters
  const dateFilter: any = {}
  if (startDate || endDate) {
    dateFilter.date = {}
    if (startDate) dateFilter.date.gte = startDate
    if (endDate) dateFilter.date.lte = endDate
  }

  // 1. Fetch Sales Income
  const sales = await prisma.transaction.aggregate({
    where: {
      company_id: dbUser.company_id,
      type: 'SALES_INVOICE',
      status: { not: 'CANCELLED' },
      ...dateFilter
    },
    _sum: { total: true }
  })

  // 2. Fetch Purchases (COGS)
  const purchases = await prisma.transaction.aggregate({
    where: {
      company_id: dbUser.company_id,
      type: 'PURCHASE_BILL',
      status: { not: 'CANCELLED' },
      ...dateFilter
    },
    _sum: { total: true }
  })

  const income = sales._sum.total || 0
  const expenses = purchases._sum.total || 0
  const netProfit = income - expenses

  return {
    income,
    expenses,
    netProfit
  }
}

export async function getGSTSummary(startDate?: Date, endDate?: Date) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })

  if (!dbUser?.company_id) throw new Error('No company found')

  const dateFilter: any = {}
  if (startDate || endDate) {
    dateFilter.date = {}
    if (startDate) dateFilter.date.gte = startDate
    if (endDate) dateFilter.date.lte = endDate
  }

  // Output GST (Tax Collected on Sales)
  const salesTax = await prisma.transaction.aggregate({
    where: {
      company_id: dbUser.company_id,
      type: 'SALES_INVOICE',
      status: { not: 'CANCELLED' },
      ...dateFilter
    },
    _sum: { tax_amount: true, subtotal: true }
  })

  // Input Tax Credit (Tax Paid on Purchases)
  const purchaseTax = await prisma.transaction.aggregate({
    where: {
      company_id: dbUser.company_id,
      type: 'PURCHASE_BILL',
      status: { not: 'CANCELLED' },
      ...dateFilter
    },
    _sum: { tax_amount: true, subtotal: true }
  })

  const outputTax = salesTax._sum.tax_amount || 0
  const inputTax = purchaseTax._sum.tax_amount || 0
  const totalTaxableSales = salesTax._sum.subtotal || 0
  const totalTaxablePurchases = purchaseTax._sum.subtotal || 0

  return {
    outputTax,
    inputTax,
    netPayable: outputTax - inputTax,
    totalTaxableSales,
    totalTaxablePurchases
  }
}

export async function getAccounts() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })

  if (!dbUser?.company_id) throw new Error('No company found')

  const accounts = await prisma.account.findMany({
    where: { company_id: dbUser.company_id },
    orderBy: { name: 'asc' }
  })
  
  return accounts
}

export async function getBalanceSheet() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  const accounts = await prisma.account.findMany({
    where: { company_id: dbUser.company_id },
    include: {
      lines: true
    }
  })

  let assets = 0
  let liabilities = 0
  let equity = 0

  accounts.forEach(acc => {
    let balance = 0
    acc.lines.forEach(line => {
      balance += (line.debit - line.credit)
    })

    if (acc.type === 'ASSET') {
      assets += balance // Assets have normal debit balances
    } else if (acc.type === 'LIABILITY') {
      liabilities -= balance // Liabilities have normal credit balances
    } else if (acc.type === 'EQUITY' || acc.type === 'INCOME' || acc.type === 'EXPENSE') {
      equity -= balance // Equity/Income/Expense ultimately roll into Equity. 
      // Note: Income (Credit) increases equity, Expense (Debit) decreases equity.
    }
  })

  return {
    assets: Math.abs(assets),
    liabilities: Math.abs(liabilities),
    equity: Math.abs(equity),
    isBalanced: Math.abs(assets - (liabilities + equity)) < 1 // Account for float rounding
  }
}

export async function getInventoryValuation() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) throw new Error('No company found')

  // Group StockLedger by item_id to get current stock
  const stockGrouped = await prisma.stockLedger.groupBy({
    by: ['item_id'],
    where: { company_id: dbUser.company_id },
    _sum: { quantity: true }
  })

  // Fetch all items to get purchase price
  const items = await prisma.item.findMany({
    where: { company_id: dbUser.company_id }
  })

  let totalValue = 0
  const itemValuations = stockGrouped.map(stock => {
    const item = items.find(i => i.id === stock.item_id)
    if (!item) return null

    const qty = stock._sum.quantity || 0
    if (qty <= 0) return null

    const value = qty * (item.purchase_price || 0)
    totalValue += value

    return {
      item_name: item.name,
      quantity: qty,
      purchase_price: item.purchase_price || 0,
      total_value: value
    }
  }).filter(Boolean)

  return {
    totalValue,
    items: itemValuations
  }
}

export async function getAccountLedger(accountId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const lines = await prisma.journalEntryLine.findMany({
    where: { account_id: accountId },
    include: {
      journal_entry: true
    },
    orderBy: {
      journal_entry: { date: 'asc' }
    }
  })

  // Calculate running balance
  let balance = 0
  const formattedLines = lines.map(line => {
    // Assuming ASSET/EXPENSE normal balance is debit (positive), LIABILITY/REVENUE/EQUITY is credit (negative)
    // For simplicity, we just do Debit - Credit as absolute running balance
    balance += (line.debit - line.credit)
    return {
      id: line.id,
      date: line.journal_entry.date,
      narration: line.journal_entry.narration,
      reference: line.journal_entry.reference,
      debit: line.debit,
      credit: line.credit,
      balance
    }
  })

  return formattedLines
}

export async function getTrialBalance() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })

  if (!dbUser?.company_id) throw new Error('No company found')

  const accounts = await prisma.account.findMany({
    where: { company_id: dbUser.company_id },
    include: {
      lines: true
    }
  })

  const trialBalance = accounts.map(acc => {
    const totalDebit = acc.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = acc.lines.reduce((sum, l) => sum + l.credit, 0)
    
    return {
      id: acc.id,
      name: acc.name,
      type: acc.type,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit // Positive means Debit balance, Negative means Credit balance
    }
  }).filter(acc => acc.balance !== 0 || acc.totalDebit > 0 || acc.totalCredit > 0)

  return trialBalance
}
