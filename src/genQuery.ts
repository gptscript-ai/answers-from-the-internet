import * as gptscript from '@gptscript-ai/gptscript'

export async function genQuery (question: string): Promise<string> {
  const tool = `
  modelName: gpt-3.5-turbo
  
  Based on the provided question, generate a query that can be used to search Google for relevant search results. Do not quote the output.
  
  question: ${question}`

  const client = new gptscript.Client()
  const run = client.evaluate(tool)
  return await run.text()
}
