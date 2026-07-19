const { app, BrowserWindow, utilityProcess } = require('electron')
const path = require('path')
const fs = require('fs')
const net = require('net')

let nextProcess = null

// Resolve writable database path
const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'dev.db')

// Resolve real app path, bypassing any virtual "app.asar" if it doesn't exist on disk
let appPath = app.getAppPath()
if (appPath.includes('app.asar') && !fs.existsSync(appPath)) {
  const unpackedPath = appPath.replace('app.asar', 'app')
  if (fs.existsSync(unpackedPath)) {
    appPath = unpackedPath
  }
}

// Load environment variables dynamically from writable AppData, process.cwd(), resources dir, or packaged app path
try {
  const envPaths = [
    path.join(userDataPath, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(appPath, '.env'),
    path.join(path.dirname(appPath), '.env'),
    process.resourcesPath ? path.join(process.resourcesPath, '.env') : null
  ].filter(Boolean)

  let loaded = false
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath })
      console.log('Loaded environment configuration from:', envPath)
      loaded = true
      break
    }
  }
  if (!loaded) {
    console.log('No .env file found on disk, applying embedded production environment defaults.')
  }
} catch (err) {
  console.warn('Failed to load dotenv configuration:', err.message)
}

// Ensure production database and environment variables are always defined
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres.zvpuvuhrjkcnstyokchw:dd%40eVaT244QV-bM@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://zvpuvuhrjkcnstyokchw.supabase.co"
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_ai81Kfnegw9bA4mAPadBoA_OYHu1x5g"
}

function runDatabaseMigrations(dbFilePath) {
  try {
    let Database;
    try {
      Database = require('./.next/standalone/node_modules/better-sqlite3')
    } catch (e) {
      try {
        Database = require('better-sqlite3')
      } catch (err) {
        throw new Error('Could not load better-sqlite3 from either standalone or root node_modules.')
      }
    }
    const db = new Database(dbFilePath)
    console.log('Running database schema migrations on startup:', dbFilePath)

    // 1. Add Branch columns if missing
    const branchCols = [
      { name: 'phone', type: 'TEXT' },
      { name: 'bank_name', type: 'TEXT' },
      { name: 'bank_account_no', type: 'TEXT' },
      { name: 'bank_ifsc', type: 'TEXT' },
      { name: 'bank_branch', type: 'TEXT' },
      { name: 'digital_sign_url', type: 'TEXT' }
    ]
    for (const col of branchCols) {
      try {
        db.prepare(`ALTER TABLE "Branch" ADD COLUMN "${col.name}" ${col.type}`).run()
        console.log(`Migrated: Added Branch column ${col.name}`)
      } catch (err) {
        if (!err.message.includes('duplicate column name')) {
          console.warn(`Branch column add warning for ${col.name}:`, err.message)
        }
      }
    }

    // 2. Add Company columns if missing
    try {
      db.prepare(`ALTER TABLE "Company" ADD COLUMN "billing_mode" TEXT DEFAULT 'BOTH'`).run()
      console.log('Migrated: Added Company column billing_mode')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('Company column add warning:', err.message)
      }
    }
    try {
      db.prepare(`ALTER TABLE "Company" ADD COLUMN "owner_name" TEXT`).run()
      console.log('Migrated: Added Company column owner_name')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('Company column add warning for owner_name:', err.message)
      }
    }
    try {
      db.prepare(`ALTER TABLE "Company" ADD COLUMN "invoice_use_branch_name" BOOLEAN NOT NULL DEFAULT 0`).run()
      console.log('Migrated: Added Company column invoice_use_branch_name')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('Company column add warning for invoice_use_branch_name:', err.message)
      }
    }

    // 3. Add Client columns if missing
    try {
      db.prepare(`ALTER TABLE "Client" ADD COLUMN "client_type" TEXT DEFAULT 'RETAIL'`).run()
      console.log('Migrated: Added Client column client_type')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('Client column add warning:', err.message)
      }
    }
    try {
      db.prepare(`ALTER TABLE "Client" ADD COLUMN "rate_type" TEXT DEFAULT 'RATE_1'`).run()
      console.log('Migrated: Added Client column rate_type')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('Client column add warning for rate_type:', err.message)
      }
    }

    // 4. Add StockLedger columns if missing
    try {
      db.prepare(`ALTER TABLE "StockLedger" ADD COLUMN "created_by" TEXT`).run()
      console.log('Migrated: Added StockLedger column created_by')
    } catch (err) {
      if (!err.message.includes('duplicate column name')) {
        console.warn('StockLedger column add warning:', err.message)
      }
    }

    // 5. Create DiscountScheme table if missing
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS "DiscountScheme" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "company_id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL DEFAULT 'BILL',
          "discount_value" INTEGER NOT NULL DEFAULT 0,
          "is_percentage" BOOLEAN NOT NULL DEFAULT 1,
          "min_bill_value" INTEGER NOT NULL DEFAULT 0,
          "start_date" DATETIME,
          "end_date" DATETIME,
          "is_active" BOOLEAN NOT NULL DEFAULT 1,
          "is_deleted" BOOLEAN NOT NULL DEFAULT 0,
          "created_by" TEXT,
          "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" DATETIME NOT NULL,
          FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `).run()
      console.log('Migrated: Created DiscountScheme table')
    } catch (err) {
      console.warn('DiscountScheme table creation warning:', err.message)
    }

    // 6. Create ClientProductPrice table if missing
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS "ClientProductPrice" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "client_id" TEXT NOT NULL,
          "item_id" TEXT NOT NULL,
          "price" INTEGER NOT NULL,
          FOREIGN KEY ("client_id") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("item_id") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `).run()
      db.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ClientProductPrice_client_id_item_id_key" ON "ClientProductPrice"("client_id", "item_id")
      `).run()
      console.log('Migrated: Created ClientProductPrice table & unique index')
    } catch (err) {
      console.warn('ClientProductPrice table creation warning:', err.message)
    }

    db.close()
    console.log('Database migrations successfully completed.')
  } catch (err) {
    console.error('Critical database migration error in main.js:', err)
  }
}

// Check if online database is configured
const isOnlineDb = process.env.DATABASE_URL && 
  (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))

// Copy template database to writable userData directory on first launch
try {
  if (!fs.existsSync(dbPath) && !fs.existsSync(dbPath + '.migrated')) {
    // Create userData folder if it doesn't exist
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true })
    }

    // Source template dev.db inside the package directory
    const sourceDbPath = path.join(appPath, 'dev.db')
    if (fs.existsSync(sourceDbPath)) {
      fs.copyFileSync(sourceDbPath, dbPath)
      console.log('Database initialized in AppData:', dbPath)
    } else {
      console.warn('Source template database not found at:', sourceDbPath)
    }
  }

  // Run schema auto-migrations on startup (safely adds missing columns) only if SQLite is used
  if (!isOnlineDb && fs.existsSync(dbPath)) {
    runDatabaseMigrations(dbPath)
  }
} catch (err) {
  console.error('Error copying/migrating SQLite database:', err)
}

// Override connection URL env variable for Next.js standalone server and Prisma Client if not online
if (!isOnlineDb) {
  process.env.DATABASE_URL = `file:${dbPath}`
}

// Find a free port dynamically to prevent conflicts
function findFreePort(callback) {
  const server = net.createServer()
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    server.close(() => callback(port))
  })
}

function startNextServer(port, callback) {
  const serverPath = path.join(appPath, '.next', 'standalone', 'server.js')
  const standaloneNodeModules = path.join(appPath, '.next', 'standalone', 'node_modules')
  const appNodeModules = path.join(appPath, 'node_modules')

  // Ensure .prisma is present in both node_modules locations
  const dotPrismaInApp = path.join(appNodeModules, '.prisma')
  const dotPrismaInStandalone = path.join(standaloneNodeModules, '.prisma')

  if (fs.existsSync(dotPrismaInApp) && !fs.existsSync(dotPrismaInStandalone)) {
    try {
      fs.cpSync(dotPrismaInApp, dotPrismaInStandalone, { recursive: true })
      console.log('Synced .prisma to standalone node_modules successfully')
    } catch (e) {
      console.error('Failed to sync .prisma to standalone:', e.message)
    }
  } else if (fs.existsSync(dotPrismaInStandalone) && !fs.existsSync(dotPrismaInApp)) {
    try {
      fs.cpSync(dotPrismaInStandalone, dotPrismaInApp, { recursive: true })
      console.log('Synced .prisma to app node_modules successfully')
    } catch (e) {
      console.error('Failed to sync .prisma to app node_modules:', e.message)
    }
  }

  process.env.PORT = String(port)
  process.env.HOSTNAME = '127.0.0.1'
  process.env.NODE_PATH = [standaloneNodeModules, appNodeModules, process.env.NODE_PATH].filter(Boolean).join(path.delimiter)
  process.env.NEXT_CACHE_DIR = path.join(userDataPath, '.cache')

  console.log(`Starting Next.js standalone server on port ${port}...`)
  
  nextProcess = utilityProcess.fork(serverPath, [], {
    env: { ...process.env },
    cwd: userDataPath,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const logFile = path.join(userDataPath, 'next-server.log')
  const logStream = fs.createWriteStream(logFile, { flags: 'a' })
  
  nextProcess.stdout.on('data', (data) => {
    logStream.write(data)
    console.log('[Next.js Server]', data.toString().trim())
  })

  nextProcess.stderr.on('data', (data) => {
    logStream.write(data)
    console.error('[Next.js Server Error]', data.toString().trim())
  })

  let interval = null

  nextProcess.on('exit', (code, signal) => {
    console.error(`Next.js server process exited with code ${code} and signal ${signal}`)
    if (interval) clearInterval(interval)
  })

  // Poll port until Next.js server starts listening
  interval = setInterval(() => {
    const client = net.connect({ port: port, host: '127.0.0.1' }, () => {
      clearInterval(interval)
      client.destroy()
      console.log('Next.js standalone server is ready!')
      callback()
    })
    client.on('error', () => {
      // Retry in 100ms
    })
  }, 100)
}

function createWindow(port) {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    title: 'Nucleus',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  win.loadURL(`http://127.0.0.1:${port}`)
}

function patchServerIfNeeded() {
  try {
    const serverPath = path.join(appPath, '.next', 'standalone', 'server.js')
    if (fs.existsSync(serverPath)) {
      try {
        fs.accessSync(serverPath, fs.constants.W_OK)
      } catch (e) {
        // Read-only (packaged inside ASAR), skipping dynamic patch
        return
      }

      let serverContent = fs.readFileSync(serverPath, 'utf8')
      let modified = false

      if (serverContent.includes('process.chdir(__dirname)')) {
        serverContent = serverContent.replace(
          'process.chdir(__dirname)',
          'if (!__dirname.includes(".asar")) { process.chdir(__dirname); }'
        )
        modified = true
        console.log('main.js: Patched server.js process.chdir')
      }

      if (!serverContent.includes('originalSetHeader')) {
        const patchCode = `
// Intercept and sanitize HTTP headers to prevent ERR_INVALID_CHAR crashes
const http = require('http');
const originalSetHeader = http.ServerResponse.prototype.setHeader;
http.ServerResponse.prototype.setHeader = function(name, value) {
  if (typeof value === 'string') {
    let cleanValue = '';
    for (let i = 0; i < value.length; i++) {
      const ch = value.charCodeAt(i);
      if (ch === 9 || (ch >= 32 && ch <= 126)) {
        cleanValue += value[i];
      } else if (ch > 126) {
        cleanValue += encodeURIComponent(value[i]);
      }
    }
    value = cleanValue;
  }
  return originalSetHeader.call(this, name, value);
};
`;
        serverContent = patchCode + '\n' + serverContent
        modified = true
        console.log('main.js: Patched server.js with header sanitization')
      }

      if (modified) {
        fs.writeFileSync(serverPath, serverContent, 'utf8')
      }
    }
  } catch (err) {
    console.error('Error executing dynamic startup patch in main.js:', err)
  }
}

async function migrateLocalSqliteToPostgres(sqlitePath, pgConnectionString) {
  console.log('Online database detected. Checking if local SQLite database needs migration:', sqlitePath)
  if (!fs.existsSync(sqlitePath)) {
    console.log('No local SQLite database found. Ready to use online database.')
    return
  }

  console.log('Local SQLite database found. Starting auto-migration to cloud...')

  let Database
  try {
    Database = require('./.next/standalone/node_modules/better-sqlite3')
  } catch (e) {
    try {
      Database = require('better-sqlite3')
    } catch (err) {
      console.error('Could not load better-sqlite3 for migration:', err.message)
      return
    }
  }

  let pg
  try {
    pg = require('./.next/standalone/node_modules/pg')
  } catch (e) {
    try {
      pg = require('pg')
    } catch (err) {
      console.error('Could not load pg for migration:', err.message)
      return
    }
  }

  const { Client } = pg
  const sqliteDb = new Database(sqlitePath, { readonly: true })
  const pgClient = new Client({ connectionString: pgConnectionString, connectionTimeoutMillis: 5000 })

  try {
    await pgClient.connect()
    console.log('Connected to cloud PostgreSQL for migration.')

    // Disable triggers/foreign keys temporarily
    let bypassConstraints = false
    try {
      await pgClient.query("SET session_replication_role = 'replica';")
      bypassConstraints = true
      console.log('Bypassed cloud database foreign key checks.')
    } catch (err) {
      console.log('Could not set session_replication_role, falling back to ordered insert.')
    }

    const tables = [
      'Company', 'Branch', 'User', 'UserBranchAccess', 'Client', 'Supplier',
      'ItemGroup', 'ItemUnit', 'Item', 'ItemVariant', 'ItemBatch', 'ItemSerial',
      'PriceSlab', 'ItemVendorCatalog', 'Transaction', 'TransactionItem',
      'TransactionTax', 'TransactionPayment', 'StockLedger', 'LocationTransfer',
      'TransferItem', 'Account', 'JournalEntry', 'JournalEntryLine', 'Shift',
      'Attendance', 'Payroll', 'LoyaltyReward', 'DiscountScheme', 'ClientProductPrice'
    ]

    for (const tableName of tables) {
      let sqliteRows = []
      try {
        sqliteRows = sqliteDb.prepare(`SELECT * FROM "${tableName}"`).all()
      } catch (err) {
        continue
      }

      if (sqliteRows.length === 0) continue

      console.log(`Migrating ${sqliteRows.length} rows for table: ${tableName}`)

      // Get PG column types
      const colMetaRes = await pgClient.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName])

      const colTypeMap = {}
      colMetaRes.rows.forEach(col => {
        colTypeMap[col.column_name] = col.data_type
      })

      for (const row of sqliteRows) {
        const columns = []
        const placeholders = []
        const values = []

        Object.entries(row).forEach(([colName, val]) => {
          const pgType = colTypeMap[colName]
          if (!pgType) return

          columns.push(`"${colName}"`)
          placeholders.push(`$${columns.length}`)

          let convertedVal = val
          if (pgType === 'boolean' || pgType === 'bool') {
            convertedVal = (val === 1 || val === '1' || val === true || val === 'true')
          } else if (pgType.includes('timestamp') || pgType === 'date') {
            convertedVal = val ? new Date(val) : null
          } else if (val === '') {
            if (pgType.includes('int') || pgType === 'numeric' || pgType === 'double precision' || pgType === 'real') {
              convertedVal = null
            }
          }
          values.push(convertedVal)
        })

        if (columns.length === 0) continue

        const insertQuery = `
          INSERT INTO "${tableName}" (${columns.join(', ')}) 
          VALUES (${placeholders.join(', ')})
          ON CONFLICT DO NOTHING
        `
        await pgClient.query(insertQuery, values)
      }
    }

    if (bypassConstraints) {
      await pgClient.query("SET session_replication_role = 'origin';")
    }

    console.log('Cloud database migration completed successfully!')
    sqliteDb.close()

    // Rename sqlite database to mark as migrated
    const migratedPath = sqlitePath + '.migrated'
    fs.renameSync(sqlitePath, migratedPath)
    console.log(`Local database renamed to ${migratedPath} to prevent re-migration.`)

  } catch (error) {
    console.error('Error during auto-migration to cloud PostgreSQL:', error)
  } finally {
    try { sqliteDb.close() } catch(e) {}
    try { await pgClient.end() } catch(e) {}
  }
}

app.whenReady().then(async () => {
  patchServerIfNeeded()
  
  // Run migration if online DB is configured
  const isOnlineDb = process.env.DATABASE_URL && 
    (process.env.DATABASE_URL.startsWith('postgres://') || process.env.DATABASE_URL.startsWith('postgresql://'))

  if (isOnlineDb) {
    try {
      await Promise.race([
        migrateLocalSqliteToPostgres(dbPath, process.env.DATABASE_URL),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB Migration timed out after 7s')), 7000))
      ])
    } catch (err) {
      console.warn('Database auto-migration skipped or timed out:', err.message)
    }
  }

  findFreePort((port) => {
    startNextServer(port, () => {
      createWindow(port)
    })
  })
})

app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (nextProcess) nextProcess.kill()
})
