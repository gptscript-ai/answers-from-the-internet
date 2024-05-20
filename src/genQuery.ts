import { Tool } from '@gptscript-ai/gptscript/lib/tool'
import { exec } from '@gptscript-ai/gptscript'

export async function genQuery (question: string): Promise<string> {
  const tool = new Tool({
    instructions: `Based on the provided question, generate a query that can be used to search Google for relevant search results. Do not quote the output.
  
  question: ${question}`
  })
  return await exec(tool, { model: 'gpt-3.5-turbo' })
}
