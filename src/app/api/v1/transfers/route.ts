import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    const branchId = cookies().get('branch_id')?.value

    const transfers = await prisma.stockLedger.findMany({
      where: { 
        company_id: dbUser.company_id,
        branch_id: branchId,
        transaction_id: { startsWith: 'TRF-' }
      },
      include: {
        item: true
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ success: true, data: transfers })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { company_id: true }
    })

    if (!dbUser?.company_id) {
      return NextResponse.json({ error: 'No company associated' }, { status: 400 })
    }

    const branchId = cookies().get('branch_id')?.value
    if (!branchId) {
      return NextResponse.json({ error: 'Please select a branch first' }, { status: 400 })
    }

    const body = await req.json()
    const { to_branch_id, items } = body

    if (!to_branch_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const results = await prisma.$transaction(async (tx) => {
      const created = []
      for (const item of items) {
        // Source branch deduction
        const sourceEntry = await tx.stockLedger.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: branchId,
            item_id: item.item_id,
            type: 'OUT',
            transaction_id: `TRF-OUT-${Date.now()}`,
            quantity: -Math.abs(item.quantity),
            remarks: `Transfer to branch ${to_branch_id}`
          },
          include: { item: true }
        })

        // Target branch addition
        await tx.stockLedger.create({
          data: {
            company_id: dbUser.company_id!,
            branch_id: to_branch_id,
            item_id: item.item_id,
            type: 'IN',
            transaction_id: `TRF-IN-${Date.now()}`,
            quantity: Math.abs(item.quantity),
            remarks: `Transfer from branch ${branchId}`
          }
        })
        
        created.push(sourceEntry)
      }
      return created
    })

    return NextResponse.json({ success: true, data: results[0] })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
