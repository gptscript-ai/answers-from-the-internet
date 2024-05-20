import { type BrowserContext } from '@playwright/test'
import * as cheerio from 'cheerio'

export interface SearchResult {
  title: string
  url: string
}

export async function search (context: BrowserContext, query: string): Promise<SearchResult[]> {
  const searchResults: SearchResult[] = []

  const page = await context.newPage()
  await page.goto('https://www.google.com/search?q=' + query)
  const contents = await page.content()

  void page.close()
  const $ = cheerio.load(contents)

  $('#rso a[ping]').each(function () {
    searchResults.push({
      url: $(this).attr('href') ?? '',
      title: $(this).find('h3').text()
    })
  })

  return searchResults.filter((result) => !result.url.includes('youtube.com/watch?v') && result.title !== '')
}
