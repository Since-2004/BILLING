import { PrismaClient } from '../prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL || ''

  if (!dbUrl || dbUrl.startsWith('file:') || dbUrl.endsWith('.db') || dbUrl.includes('dev.db')) {
    dbUrl = "postgresql://postgres.zvpuvuhrjkcnstyokchw:dd%40eVaT244QV-bM@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
  }

  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
  const pool = new Pool({ 
    connectionString: dbUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
