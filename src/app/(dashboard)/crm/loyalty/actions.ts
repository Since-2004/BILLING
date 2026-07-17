'use server'

import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function getLoyaltyRewards() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { company_id: true }
  })
  if (!dbUser?.company_id) return []

  const rewards = await prisma.loyaltyReward.findMany({
    where: { 
      client: {
        company_id: dbUser.company_id
      }
    },
    include: {
      client: {
        select: { name: true, email: true, phone: true }
      }
    },
    orderBy: { points: 'desc' }
  })

  return rewards
}
