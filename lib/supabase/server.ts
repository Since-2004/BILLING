import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import crypto from 'crypto'

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function createClient() {
  const cookieStore = cookies()

  return {
    auth: {
      async getUser() {
        const sessionUserId = cookieStore.get('session_user_id')?.value
        const sessionUserEmail = cookieStore.get('session_user_email')?.value
        const sessionUserName = cookieStore.get('session_user_name')?.value

        if (!sessionUserId) {
          return { data: { user: null }, error: { message: 'Unauthorized' } }
        }

        return {
          data: {
            user: {
              id: sessionUserId,
              email: sessionUserEmail || '',
              user_metadata: {
                full_name: sessionUserName || '',
              }
            }
          },
          error: null
        }
      },

      async signInWithPassword({ email, password }: any) {
        try {
          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || user.is_deleted) {
            return { data: { user: null }, error: { message: 'Invalid email or password' } }
          }

          const hashedPassword = hashPassword(password)
          if (user.password !== hashedPassword) {
            return { data: { user: null }, error: { message: 'Invalid email or password' } }
          }

          // Set cookies (secure: false to support loopback HTTP inside Electron and localhost)
          cookieStore.set('session_user_id', user.id, { path: '/', httpOnly: true, secure: false })
          cookieStore.set('session_user_email', user.email, { path: '/', httpOnly: true, secure: false })
          cookieStore.set('session_user_name', user.name, { path: '/', httpOnly: true, secure: false })

          return { data: { user: { id: user.id, email: user.email } }, error: null }
        } catch (err: any) {
          console.error('Login database error:', err);
          return { data: { user: null }, error: { message: 'Database connection error. Please try again.' } }
        }
      },

      async signUp({ email, password, options }: any) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          })

          if (existingUser) {
            return { data: { user: null }, error: { message: 'User already exists' } }
          }

          const newId = crypto.randomUUID()
          
          // Set session cookies (secure: false to support loopback HTTP inside Electron and localhost)
          cookieStore.set('session_user_id', newId, { path: '/', httpOnly: true, secure: false })
          cookieStore.set('session_user_email', email, { path: '/', httpOnly: true, secure: false })
          cookieStore.set('session_user_name', options?.data?.full_name || '', { path: '/', httpOnly: true, secure: false })

          return {
            data: {
              user: { id: newId, email }
            },
            error: null
          }
        } catch (err: any) {
          console.error('Signup database error:', err);
          return { data: { user: null }, error: { message: 'Database connection error. Please try again.' } }
        }
      },

      async signOut() {
        cookieStore.set({ name: 'session_user_id', value: '', maxAge: 0, path: '/' })
        cookieStore.set({ name: 'session_user_email', value: '', maxAge: 0, path: '/' })
        cookieStore.set({ name: 'session_user_name', value: '', maxAge: 0, path: '/' })
        return { error: null }
      }
    }
  }
}
