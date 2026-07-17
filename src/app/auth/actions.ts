'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, hashPassword } from '@/lib/supabase/server'
import prisma from '@/lib/prisma'

export async function login(formData: FormData) {
  const supabase = createClient()

  // type-casting here for convenience
  // in practice, use a schema validator like zod
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect('/login?error=' + encodeURIComponent(error.message))
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    name: formData.get('name') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.name,
      }
    }
  })

  if (error) {
    return redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  // Create User in DB
  if (authData.user) {
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        password: hashPassword(data.password),
        role: "OWNER"
      }
    })
  }

  revalidatePath('/', 'layout')
  redirect('/company-setup')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
