import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.company_id) return NextResponse.json({ error: 'No company' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  
  let monthStart: Date
  let monthEnd: Date

  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  if (fromParam || toParam) {
    monthStart = fromParam ? new Date(fromParam) : new Date(new Date().getFullYear(), 3, 1)
    monthEnd = toParam ? new Date(toParam + 'T23:59:59') : new Date()
  } else {
    const month = Number(searchParams.get('month') || new Date().getMonth() + 1)
    const year = Number(searchParams.get('year') || new Date().getFullYear())
    monthStart = new Date(year, month - 1, 1)
    monthEnd = new Date(year, month, 0, 23, 59, 59)
  }

  try {
    const [outward, inward, creditNotes] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { subtotal: true, tax_amount: true, total: true },
        where: { company_id: dbUser.company_id, type: 'SALES_INVOICE', status: { not: 'CANCELLED' }, date: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.transaction.aggregate({
        _sum: { subtotal: true, tax_amount: true, total: true },
        where: { company_id: dbUser.company_id, type: 'PURCHASE_BILL', status: { not: 'CANCELLED' }, date: { gte: monthStart, lte: monthEnd } }
      }),
      prisma.transaction.aggregate({
        _sum: { total: true, tax_amount: true },
        where: { company_id: dbUser.company_id, type: 'SALES_RETURN', status: { not: 'CANCELLED' }, date: { gte: monthStart, lte: monthEnd } }
      })
    ])

    const outwardTax = outward._sum.tax_amount || 0
    const inwardTax = inward._sum.tax_amount || 0
    const cgstPayable = Math.round(outwardTax / 2)
    const sgstPayable = Math.round(outwardTax / 2)
    const cgstCredit = Math.round(inwardTax / 2)
    const sgstCredit = Math.round(inwardTax / 2)

    return NextResponse.json({
      success: true,
      data: {
        outwardTaxableValue: outward._sum.subtotal || 0,
        outwardTax,
        inwardTaxableValue: inward._sum.subtotal || 0,
        cgstPayable, sgstPayable,
        cgstCredit, sgstCredit,
        netCGST: cgstPayable - cgstCredit,
        netSGST: sgstPayable - sgstCredit,
        netTaxPayable: outwardTax - inwardTax,
        creditNoteValue: creditNotes._sum.total || 0,
        creditNoteTax: creditNotes._sum.tax_amount || 0,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
