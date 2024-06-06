import { type BrowserContext, chromium, firefox } from '@playwright/test'

export async function getNewContext (browser: string, sessionDir: string, javaScriptEnabled: boolean): Promise<BrowserContext> {
  switch (browser) {
    case 'chrome':
      return await chromium.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          headless: true,
          viewport: null,
          channel: 'chrome',
          args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation', '--use-mock-keychain'],
          javaScriptEnabled
        })
    case 'firefox':
      return await firefox.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36',
          headless: true,
          viewport: null,
          javaScriptEnabled
        })
    case 'edge':
      return await chromium.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.64',
          headless: true,
          viewport: null,
          channel: 'msedge',
          args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation', '--use-mock-keychain'],
          javaScriptEnabled
        })
    default:
      throw new Error(`Unknown browser: ${browser}`)
  }
}
