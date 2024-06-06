import { type BrowserContext } from '@playwright/test'
import * as cheerio from 'cheerio'
import { getContents } from './getContents.ts'

export async function search (browser: string, context: BrowserContext, noJSContext: BrowserContext, query: string): Promise<string> {
  const foundURLs = new Set<string>()
  const contentsPromises: Array<Promise<string>> = []

  const pagePromise = context.newPage()
  const noJSPagePromises = [noJSContext.newPage(), noJSContext.newPage(), noJSContext.newPage()]
  const [page, noJSPage0, noJSPage1, noJSPage2] = await Promise.all([pagePromise, noJSPagePromises[0], noJSPagePromises[1], noJSPagePromises[2]])
  const noJSPages = [noJSPage0, noJSPage1, noJSPage2]
  await page.goto('https://www.google.com/search?q=' + query + '&udm=14')
  const contents = await page.content()

  void page.close()
  const $ = cheerio.load(contents)

  const elements = $('#rso a[jsname]')
  let count = 0
  for (const e of elements) {
    const url = $(e).attr('href') ?? ''
    if (url !== '' && !url.includes('youtube.com/watch?v') && !foundURLs.has(url)) {
      foundURLs.add(url)
      contentsPromises.push(getContents(noJSPages[count], url))
      count++
    }
    if (contentsPromises.length === 3) {
      break
    }
  }

  return (await Promise.all(contentsPromises)).filter(c => c !== '').join('\n\n{PAGE SEPARATOR}\n\n')
}
