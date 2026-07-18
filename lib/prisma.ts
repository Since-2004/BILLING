import { PrismaClient } from '../prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaBetterSqlite } from '@prisma/adapter-better-sqlite3'
import Database from 'better-sqlite3'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || ''

  if (dbUrl.startsWith('file:') || dbUrl.endsWith('.db') || dbUrl.includes('dev.db')) {
    // Local SQLite database fallback using PrismaBetterSqlite driver adapter
    const filePath = dbUrl.replace(/^file:/, '')
    const sqlite = new Database(filePath)
    const adapter = new PrismaBetterSqlite(sqlite)
    return new PrismaClient({ adapter })
  } else {
    // Online PostgreSQL database using PrismaPg driver adapter with SSL support for Supabase/Cloud DBs
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')
    const pool = new Pool({ 
      connectionString: dbUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false }
    })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
  }
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
