import { type BrowserContext } from '@playwright/test'
import TurndownService from 'turndown'
import * as cheerio from 'cheerio'

export async function getContents (context: BrowserContext, url: string): Promise<string> {
  const page = await context.newPage()
  try {
    await page.goto(url, { timeout: 5000 })
  } catch (e) {
    console.warn('slow page:', url)
    void page.close()
    return '' // Page didn't load fast enough; just ignore.
  }
  const content = await page.content()
  void page.close()

  const $ = cheerio.load(content)

  $('script').each(function () {
    const elem = $(this)
    elem.contents().filter(function () {
      return this.type === 'text'
    }).remove()
    const children = elem.contents()
    elem.before(children)
    elem.remove()
  })
  $('style').remove()
  $('img').remove()
  $('[style]').removeAttr('style')
  $('[onclick]').removeAttr('onclick')
  $('[onload]').removeAttr('onload')
  $('[onerror]').removeAttr('onerror')

  // Remove empty divs and spans
  $('div').each(function () {
    if ($(this).text() === '' && $(this).children().length === 0) {
      $(this).remove()
    }
  })
  $('span').each(function () {
    if ($(this).text() === '' && $(this).children().length === 0) {
      $(this).remove()
    }
  })

  let resp = ''
  const turndownService = new TurndownService()
  $('body').each(function () {
    resp += turndownService.turndown($.html(this))
  })

  return (`Contents of ${url}:\n\n` + trunc(resp, 80000)).replace(/---+/g, function (match) {
    return '_'.repeat(match.length)
  })
}

function trunc (text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text
}
