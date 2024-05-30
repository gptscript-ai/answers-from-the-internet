import path from 'node:path'
import { search } from './search.ts'
import { genQuery } from './genQuery.ts'
import { getNewContext } from './context.ts'
import * as gptscript from '@gptscript-ai/gptscript'

const gptsClient = new gptscript.Client('', '')

const input = process.env.GPTSCRIPT_INPUT
delete (process.env.GPTSCRIPT_INPUT)
if (input === undefined) {
  console.log('error: no input provided')
  process.exit(1)
}

const data = JSON.parse(input)
const question: string = data.question ?? ''
if (question === '') {
  console.log('error: no question provided')
  process.exit(1)
}

if (process.env.GPTSCRIPT_WORKSPACE_ID === undefined || process.env.GPTSCRIPT_WORKSPACE_DIR === undefined) {
  console.log('error: GPTScript workspace ID and directory are not set')
  process.exit(1)
}
const sessionDir = path.resolve(process.env.GPTSCRIPT_WORKSPACE_DIR) + '/browser_session'

// Simultaneously start the browser and generate our search query.
const queryPromise = genQuery(question)
const contextPromise = getNewContext(sessionDir, true)
const noJSContextPromise = getNewContext(sessionDir + '_no_js', false)
const [query, context, noJSContext] = await Promise.all([queryPromise, contextPromise, noJSContextPromise])

// Query Google
const pageContents = await search(context, noJSContext, query)
void context.close()
void noJSContext.close()

// Ask gpt-4o to generate an answer
const tool = `temperature: 0.2

Based on the provided contents of the web pages, answer the question.
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
const run = gptsClient.evaluate(tool, { disableCache: true })
let prev = ''
run.on(gptscript.RunEventType.CallProgress, (data) => {
  // We don't want to start printing until we see the first "### Sources" line.
  // Also, sometimes the content will get messed up and a space will get dropped,
  // so we make sure each content includes the previous one before we print the new part of it.
  if (data.content === undefined || !data.content.includes('###') || !data.content.includes(prev)) {
    return
  }

  process.stdout.write(data.content.slice(prev.length))
  prev = data.content
})
await run.text()
