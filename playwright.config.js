import { defineConfig, devices } from '@playwright/test'

// index.html es estático (sin build, sin variables de entorno) -- se sirve
// tal cual con `serve`. El cliente de Supabase adentro apunta al proyecto
// REAL (URL/anon-key hardcodeados en el <script> -- no hay forma de
// swapearlos sin un paso de build que este repo no tiene), así que la
// seguridad de "nunca tocar producción" acá corre 100% por cuenta de
// e2e/support/supabaseMock.js interceptando ese hostname real con
// page.route() ANTES de cualquier page.goto() -- ver el comentario largo
// en ese archivo.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5290',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx serve . -p 5290',
    url: 'http://127.0.0.1:5290',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
