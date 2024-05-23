import express, { type Request, type Response } from 'express'
import bodyParser from 'body-parser'
import { loadSettingsFile } from './settings'
import * as os from 'node:os'
import path from 'node:path'
import { existsSync, mkdirSync } from 'fs'
import { type BrowserContext, chromium } from '@playwright/test'
import { Mutex } from 'async-mutex'
import { search } from './google'
import { genQuery } from './genQuery'
import { getContents } from './getContents'
import { Tool } from '@gptscript-ai/gptscript/lib/tool'
import { exec } from '@gptscript-ai/gptscript'

const mutex = new Mutex()

async function main (): Promise<void> {
  const settings = loadSettingsFile()

  const app = express()
  const port = process.env.PORT ?? 9888
  delete (process.env.GPTSCRIPT_INPUT)
  app.use(bodyParser.json())

  const contextMap: Record<string, BrowserContext> = {}

  app.get('/', (req: Request, res: Response) => {
    res.send('OK')
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/ask', async (req: Request, res: Response) => {
    const initStart = new Date().getTime()
    const data = req.body
    console.log(data)
    const question: string = data.question ?? ''
    if (question === '') {
      res.status(400).send('No question provided')
    }

    if (process.env.GPTSCRIPT_WORKSPACE_ID === undefined || process.env.GPTSCRIPT_WORKSPACE_DIR === undefined) {
      res.status(400).send('GPTScript workspace ID and directory are not set')
      return
    }

    let sessionID: string
    let sessionDir: string

    if (settings.useDefaultSession === true) {
      sessionID = 'default'
      switch (os.platform()) {
        case 'win32':
          sessionDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data')
          break
        case 'darwin':
          sessionDir = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome')
          break
        case 'linux':
          sessionDir = path.join(os.homedir(), '.config', 'google-chrome')
          break
        default:
          throw new Error('unsupported OS: ' + os.platform())
      }
    } else {
      sessionID = process.env.GPTSCRIPT_WORKSPACE_ID
      sessionDir = path.resolve(process.env.GPTSCRIPT_WORKSPACE_DIR) + '/browser_session'

      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir)
      }
    }
    console.log('init time:', new Date().getTime() - initStart, 'ms')

    const browserLaunchStart = new Date().getTime()
    let context: BrowserContext
    if (contextMap[sessionID] !== undefined) {
      context = contextMap[sessionID]
    } else {
      context = await chromium.launchPersistentContext(
        sessionDir,
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          headless: settings.headless ?? false,
          viewport: null,
          channel: 'chrome',
          args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
          ignoreDefaultArgs: ['--enable-automation', '--use-mock-keychain']
        })
    }
    console.log('browser launch time:', new Date().getTime() - browserLaunchStart, 'ms')

    context.on('close', () => {
      setTimeout(() => {
        process.exit(0)
      }, 3000)
    })

    // Generate the query to use with Google
    const genQueryStart = new Date().getTime()
    const query = await genQuery(question)
    console.log('gen query time:', new Date().getTime() - genQueryStart, 'ms')

    // Surround browser operations with a mutex to avoid race conditions from parallel tool calls
    const release = await mutex.acquire()

    // Query Google
    const searchStart = new Date().getTime()
    const searchResults = await search(context, query)
    console.log('search time:', new Date().getTime() - searchStart, 'ms')

    // Get the results of the first five pages
    const pageStart = new Date().getTime()
    const results = searchResults.slice(0, 5)
    const pageContentsPromises = results.map(async (result) => await getContents(context, result.url))
    const pageContents = (await Promise.all(pageContentsPromises)).filter(c => c !== '').join('\n\n{PAGE SEPARATOR}\n\n')
    console.log('page contents time:', new Date().getTime() - pageStart, 'ms')

    release()

    // Ask gpt-4o to generate an answer
    const answerStart = new Date().getTime()
    const tool = new Tool({
      instructions: `Based on the provided contents of the web pages, answer the question.
      Provide as much detail as possible.
      Do not infer or assume anything. Only use the information provided in the web pages.
      Do not repeat entire sentences word-for-word from the websites. Summarize and rephrase things in your own words.

      You want to return the most helpful answer that you can. If there are multiple answers or solutions to the question,
      then provide all of them. Provide as much detail as you can.
      
      Format your answer in Markdown, following the example.
      
      EXAMPLE
      
      ### Sources:
      - [Source Title](Source URL)
      - [Source Title](Source URL)
      
      ### Answer:
      Answer text here.
      
      END EXAMPLE
      
      question: ${question}
      
      page contents:
      
      ${pageContents}`
    })
    const response = await exec(tool, { model: 'gpt-4o' })
    console.log('answer time:', new Date().getTime() - answerStart, 'ms')

    res.send(response)
    res.end()
  })

  const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`)
  })

  // stdin is used as a keep-alive mechanism. When the parent process dies the stdin will be closed and this process
  // will exit.
  process.stdin.resume()
  process.stdin.on('close', () => {
    console.log('Closing the server')
    server.close()
    process.exit(0)
  })

  process.on('SIGINT', () => {
    console.log('Closing the server')
    server.close()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('Closing the server')
    server.close()
    process.exit(0)
  })

  process.on('SIGHUP', () => {
    console.log('Closing the server')
    server.close()
    process.exit(0)
  })
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main()
