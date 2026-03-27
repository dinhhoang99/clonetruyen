import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BASE_URL = 'https://truyenqqno.com'

// ── Playwright browser context (singleton) ────────────────────────────────────
// Dùng Chromium thực thay vì axios để bypass Cloudflare JS challenge
let _browser = null
let _context = null

const { exec } = await import('node:child_process')
const { promisify } = await import('node:util')
const execAsync = promisify(exec)

const getBrowserContext = async () => {
  if (_context) return _context

  const { chromium } = await import('playwright')

  console.log('[proxy] Khởi động trình duyệt Chromium để bypass Cloudflare...')
  try {
    _browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    })
  } catch (launchError) {
    console.warn('[proxy] chromium.launch thất bại:', launchError.message)
    if (launchError.message && launchError.message.includes("Executable doesn't exist")) {
      console.log('[proxy] Đang cài Playwright Chromium...')
      await execAsync('npx playwright install chromium', { cwd: process.cwd(), shell: true })
      console.log('[proxy] Cài xong, thử khởi động lại Chromium...')
      _browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      })
    } else {
      throw launchError
    }
  }

  _context = await _browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'vi-VN',
    extraHTTPHeaders: {
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    viewport: { width: 1280, height: 800 },
  })

  // Warm-up: truy cập trang chủ để lấy cookies Cloudflare
  try {
    console.log('[proxy] Warm-up Cloudflare cookies...')
    const page = await _context.newPage()
    const response = await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    console.log(`[proxy] Warm-up: HTTP ${response?.status()}`)
    await page.close()
  } catch (e) {
    console.warn('[proxy] Warm-up thất bại:', e.message)
  }

  return _context
}

// ── Fetch HTML bằng Playwright page ──────────────────────────────────────────
const fetchWithBrowser = async (url, options = {}) => {
  const ctx = await getBrowserContext()
  const page = await ctx.newPage()
  try {
    if (options.method === 'POST' && options.body) {
      // POST request dùng Playwright request context thay vì page.evaluate để tránh CORS/JS fetch failure
      const requestContext = ctx.request
      const response = await requestContext.post(url, {
        data: options.body,
        headers: {
          'Content-Type': options.contentType || 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': `${BASE_URL}/`,
        },
        timeout: 60000,
      })
      const text = await response.text()
      return { status: response.status(), text }
    } else {
      // GET request bình thường
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
      if (!response) {
        throw new Error('No response from target URL')
      }
      const status = response.status()
      let text = ''
      try {
        if (status >= 500) {
          // Thử lấy body trực tiếp từ response khi lỗi server
          text = await response.text()
        } else {
          text = await page.content()
        }
      } catch (e) {
        console.warn('[proxy] Không thể lấy nội dung page.content() hoặc response.text():', e.message)
      }
      return { status, text }
    }
  } finally {
    await page.close()
  }
}

// ── axios client cho image proxy (không cần JS) ───────────────────────────────
let _axiosClient = null
const getAxiosClient = async () => {
  if (_axiosClient) return _axiosClient
  const { default: axios } = await import('axios')
  const { wrapper } = await import('axios-cookiejar-support')
  const { CookieJar } = await import('tough-cookie')
  const jar = new CookieJar()
  _axiosClient = wrapper(axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    maxRedirects: 10,
    validateStatus: () => true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': `${BASE_URL}/`,
    },
  }))
  return _axiosClient
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'truyenqq-proxy',
      configureServer(server) {
        // Khởi tạo browser sớm khi dev server start
        getBrowserContext().catch(console.error)

        // ── Image proxy: /img-proxy?url=https://... ───────────────────────────
        // Ảnh dùng axios để nhanh hơn (không cần JS challenge)
        const imgCache = new Map()

        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/img-proxy')) return next()

          const urlParam = new URL(req.url, 'http://localhost').searchParams.get('url')
          if (!urlParam) { res.writeHead(400); res.end('Missing url param'); return }

          if (imgCache.has(urlParam)) {
            const { data, ct } = imgCache.get(urlParam)
            res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' })
            res.end(data)
            return
          }

          try {
            const client = await getAxiosClient()
            const response = await client.get(urlParam, {
              responseType: 'arraybuffer',
              headers: {
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': `${BASE_URL}/`,
              },
            })
            const ct = response.headers['content-type'] || 'image/jpeg'
            if (response.status === 200) {
              if (imgCache.size < 500) imgCache.set(urlParam, { data: response.data, ct })
              res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'public, max-age=86400' })
              res.end(response.data)
            } else {
              res.writeHead(response.status); res.end()
            }
          } catch (err) {
            console.error('[img-proxy] Lỗi:', err.message)
            res.writeHead(502); res.end()
          }
        })

        // ── HTML proxy: /proxy/... (dùng Playwright browser thực) ────────────
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/proxy')) return next()

          const path = req.url.slice('/proxy'.length) || '/'
          const targetUrl = `${BASE_URL}${path}`
          const method = req.method || 'GET'

          // Đọc body nếu là POST
          let requestBody = null
          let contentType = 'application/x-www-form-urlencoded'
          if (method === 'POST') {
            requestBody = await new Promise((resolve) => {
              const chunks = []
              req.on('data', chunk => chunks.push(chunk))
              req.on('end', () => resolve(Buffer.concat(chunks)))
              req.on('error', () => resolve(Buffer.alloc(0)))
            })
            contentType = req.headers['content-type'] || contentType
          }

          try {
            console.log(`[proxy] ${method} ${targetUrl}`)
            const result = await fetchWithBrowser(targetUrl, {
              method,
              body: requestBody,
              contentType,
            })
            console.log(`[proxy] ${method} ${path} -> ${result.status}`)
            const body = result.text || ''
            res.writeHead(result.status, { 'Content-Type': 'text/html;charset=utf-8' })
            res.end(body)
          } catch (err) {
            console.error(`[proxy] Lỗi khi fetch ${targetUrl}:`, err.message)
            res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
            res.end(`Proxy error: ${err.message}`)
          }
        })
      },
    },
  ],
})
