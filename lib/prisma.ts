import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  let dbUrl = process.env.DATABASE_URL || ''

  if (!dbUrl) {
    dbUrl = "postgresql://postgres.zvpuvuhrjkcnstyokchw:dd%40eVaT244QV-bM@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  }

  if (dbUrl.startsWith('file:') || dbUrl.endsWith('.db') || dbUrl.includes('dev.db')) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Database = require('better-sqlite3')
      const filePath = dbUrl.replace(/^file:/, '')
      const db = new Database(filePath)
      const adapter = new PrismaBetterSqlite3(db)
      return new PrismaClient({ adapter })
    } catch (e) {
      return new PrismaClient()
    }
  }

  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
  const pool = new Pool({ 
    connectionString: dbUrl,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
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
