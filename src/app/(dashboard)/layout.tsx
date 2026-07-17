import { DashboardLayoutWrapper } from '@/components/shared/DashboardLayoutWrapper'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user with company and branch info
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      company: true,
      user_branch_access: {
        include: { branch: true }
      }
    }
  })

  if (!dbUser?.company_id) {
    redirect('/company-setup')
  }

  const plainUser = JSON.parse(JSON.stringify(dbUser))

  return (
    <DashboardLayoutWrapper user={plainUser}>
      {children}
    </DashboardLayoutWrapper>
  )
}
