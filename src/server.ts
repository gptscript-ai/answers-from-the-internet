import path from 'node:path'
import { search } from './search.ts'
import { genQuery } from './genQuery.ts'
import { getBrowser, getNewContext } from './context.ts'
import * as gptscript from '@gptscript-ai/gptscript'
import { rmSync } from 'node:fs'

const gptsClient = new gptscript.GPTScript()

const question: string = process.env.QUESTION ?? ''
if (question === '') {
  console.log('error: no question provided')
  process.exit(1)
}

if (process.env.GPTSCRIPT_WORKSPACE_ID === undefined || process.env.GPTSCRIPT_WORKSPACE_DIR === undefined) {
  console.log('error: GPTScript workspace ID and directory are not set')
  process.exit(1)
}

const browserName = await getBrowser()

// Simultaneously start the browser and generate our search query.
const queryPromise = genQuery(question)
const contextPromise = getNewContext(browserName, path.resolve(process.env.GPTSCRIPT_WORKSPACE_DIR), true)
const noJSContextPromise = getNewContext(browserName, path.resolve(process.env.GPTSCRIPT_WORKSPACE_DIR), false)
const [query, context, noJSContext] = await Promise.all([queryPromise, contextPromise, noJSContextPromise])

// Query Google
const pageContents = await search(browserName, context.context, noJSContext.context, query)

// Ask gpt-4o to generate an answer
const tool: gptscript.ToolDef = {
  agents: [],
  arguments: { type: 'object' },
  chat: false,
  context: [],
  credentials: [],
  description: '',
  export: [],
  exportContext: [],
  globalModelName: '',
  globalTools: [],
  jsonResponse: false,
  maxTokens: 0,
  modelName: '',
  modelProvider: false,
  name: '',
  tools: [],
  temperature: 0.2,
  instructions: `Based on the provided contents of the web pages, answer the question.
Provide as much detail as possible.
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
}

const run = await gptsClient.evaluate(tool, { disableCache: true })
let prev = ''
run.on(gptscript.RunEventType.CallProgress, data => {
  // We don't want to start printing until we see the first "### Sources" line.
  // Also, sometimes the content will get messed up and a space will get dropped,
  // so we make sure each content includes the previous one before we print the new part of it.
  if (data.output.length < 1 || data.output[0].content === undefined || !data.output[0].content.includes('###') || !data.output[0].content.includes(prev)) {
    return
  }

  process.stdout.write(data.output[0].content.slice(prev.length))
  prev = data.output[0].content
})
await context.context.close()
await noJSContext.context.close()
rmSync(context.sessionDir, { recursive: true, force: true })
rmSync(noJSContext.sessionDir, { recursive: true, force: true })
await run.text()
process.exit(0)
