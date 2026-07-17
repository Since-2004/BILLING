const fs = require('fs')
const path = require('path')

console.log('Copying static and public assets to standalone folder...')
const standaloneDir = path.join(__dirname, '.next', 'standalone')

if (fs.existsSync(standaloneDir)) {
  // Copy public directory
  const publicSrc = path.join(__dirname, 'public')
  const publicDest = path.join(standaloneDir, 'public')
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, publicDest, { recursive: true })
    console.log('Copied public/ folder to standalone')
  }

  // Copy static directory
  const staticSrc = path.join(__dirname, '.next', 'static')
  const staticDest = path.join(standaloneDir, '.next', 'static')
  if (fs.existsSync(staticSrc)) {
    fs.cpSync(staticSrc, staticDest, { recursive: true })
    console.log('Copied .next/static/ folder to standalone')
  }
  console.log('Asset copying completed successfully!')

  // Patch server.js to avoid process.chdir(__dirname) crash in packaged electron apps
  const serverPath = path.join(standaloneDir, 'server.js')
  if (fs.existsSync(serverPath)) {
    let serverContent = fs.readFileSync(serverPath, 'utf8')
    if (serverContent.includes('process.chdir(__dirname)')) {
      serverContent = serverContent.replace(
        'process.chdir(__dirname)',
        'if (!__dirname.includes(".asar")) { process.chdir(__dirname); }'
      )
      console.log('Successfully patched server.js process.chdir for Electron!')
    }

    // Add HTTP header sanitization patch
    const debugCode = `
// Intercept and sanitize HTTP headers to prevent ERR_INVALID_CHAR crashes
const http = require('http');
const originalSetHeader = http.ServerResponse.prototype.setHeader;
http.ServerResponse.prototype.setHeader = function(name, value) {
  const lowerName = name && typeof name === 'string' ? name.toLowerCase() : '';
  if (lowerName === 'x-action-redirect' || lowerName === 'location') {
    if (typeof value === 'string') {
      let cleanValue = '';
      for (let i = 0; i < value.length; i++) {
        const ch = value.charCodeAt(i);
        // Allow tab (9), standard ASCII printable characters (32-126), and Latin-1 supplement (160-255)
        if (ch === 9 || (ch >= 32 && ch <= 126) || (ch >= 160 && ch <= 255)) {
          cleanValue += value[i];
        } else if (ch > 255) {
          // Percent-encode Unicode characters so they are valid in HTTP headers
          cleanValue += encodeURIComponent(value[i]);
        }
      }
      value = cleanValue;
    }
  }
  return originalSetHeader.call(this, name, value);
};
`;
    if (!serverContent.includes('x-action-redirect') || !serverContent.includes('originalSetHeader')) {
      serverContent = debugCode + '\n' + serverContent
      console.log('Successfully patched server.js with header sanitization logic!')
    }
    fs.writeFileSync(serverPath, serverContent, 'utf8')

    // Delete better-sqlite3 native module from standalone to force fallback to root node_modules
    const standaloneBetterSqlite = path.join(standaloneDir, 'node_modules', 'better-sqlite3')
    if (fs.existsSync(standaloneBetterSqlite)) {
      fs.rmSync(standaloneBetterSqlite, { recursive: true, force: true })
      console.log('Successfully removed standalone better-sqlite3 to enable parent node_modules fallback!')
    }
  }
} else {
  console.error('Error: .next/standalone folder not found. Run npm run build first.')
  process.exit(1)
}
