import * as gptscript from '@gptscript-ai/gptscript'

export async function genQuery (question: string): Promise<string> {
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
    modelProvider: false,
    name: '',
    tools: [],
    modelName: 'gpt-4o',
    instructions: `
    Based on the provided question, generate a query that can be used to search Google for relevant search results. Do not quote the output.
  
  question: ${question}`
  }

  const client = new gptscript.GPTScript()
  const run = await client.evaluate(tool)
  return await run.text()
}
