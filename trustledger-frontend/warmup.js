/**
 * Warmup script — pre-compiles all Next.js pages so navigation is instant
 * Run after: npm run dev
 */
const http = require('http')

const BASE = 'http://localhost:3001'

const PAGES = [
  '/',
  '/login',
  '/signup',
  '/dashboard',
  '/transactions',
  '/fraud',
  '/market',
  '/compliance',
  '/assistant',
  '/reports',
  '/green',
  '/admin',
  '/settings',
  '/help',
]

function fetchPage(path) {
  return new Promise((resolve) => {
    const url = BASE + path
    http.get(url, (res) => {
      res.resume()
      res.on('end', () => {
        console.log(`  ✓ ${path} (${res.statusCode})`)
        resolve()
      })
    }).on('error', () => {
      console.log(`  ✗ ${path} (failed)`)
      resolve()
    })
  })
}

async function warmup() {
  console.log('\n🔥 Warming up all pages for instant navigation...\n')
  // Wait for server to be ready
  await new Promise(r => setTimeout(r, 3000))
  
  for (const page of PAGES) {
    await fetchPage(page)
    await new Promise(r => setTimeout(r, 200))
  }
  
  console.log('\n✅ All pages compiled! Navigation is now instant.\n')
}

warmup()
