import { type BrowserContext, chromium } from '@playwright/test'

export async function getNewContext (sessionDir: string, javaScriptEnabled: boolean): Promise<BrowserContext> {
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
}
