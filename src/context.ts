import { type BrowserContext, chromium, firefox } from '@playwright/test'
import { randomInt } from 'node:crypto'

export async function getBrowser (): Promise<string> {
  const browsers = [
    { name: 'Chrome', launchFunction: async () => await chromium.launch({ channel: 'chrome' }) },
    { name: 'Edge', launchFunction: async () => await chromium.launch({ channel: 'msedge' }) },
    { name: 'Firefox', launchFunction: async () => await firefox.launch() },
    { name: 'Chromium', launchFunction: async () => await chromium.launch() }
  ]

  const errors = []
  for (const browser of browsers) {
    try {
      const browserInstance = await browser.launchFunction()
      void browserInstance.close()
      return browser.name.toLowerCase()
    } catch (error) {
      errors.push(error)
    }
  }

  throw new Error(`No supported browsers (Chrome, Edge, Firefox) are installed. ${errors}`)
}

export interface ContextAndSessionDir {
  context: BrowserContext
  sessionDir: string
}

export async function getNewContext (browser: string, workspaceDir: string, javaScriptEnabled: boolean): Promise<ContextAndSessionDir> {
  const sessionDir = workspaceDir + '/afti_browser_session_' + randomInt(1, 1000000).toString()
  let context: BrowserContext
  switch (browser) {
    case 'chromium':
      context = await chromium.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          headless: true,
          viewport: null,
          args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation', '--use-mock-keychain'],
          javaScriptEnabled
        })
      break
    case 'chrome':
      context = await chromium.launchPersistentContext(
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
      break
    case 'firefox':
      context = await firefox.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/89.0 Safari/537.36',
          headless: true,
          viewport: null,
          javaScriptEnabled
        })
      break
    case 'edge':
      context = await chromium.launchPersistentContext(
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
      break
    default:
      throw new Error(`Unknown browser: ${browser}`)
  }

  return { context, sessionDir }
}
