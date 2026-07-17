import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'
import { CompanySetupForm } from './form'

export default async function CompanySetupPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user already belongs to a company
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { company: true }
  })

  if (dbUser?.company_id) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="max-w-2xl w-full space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800">
        <div className="text-center">
          <h2 className="mt-2 text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Setup Your Company
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Let's get your business profile created so you can start billing.
          </p>
        </div>
        
        <CompanySetupForm userId={user.id} />
      </div>
    </div>
  )
}
