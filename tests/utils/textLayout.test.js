import { describe, it, expect } from 'vitest'
import { wrapText } from '../../src/renderer/utils/textLayout.js'

// measureFn: длина строки в символах (каждый символ = 1 единица)
const measure = (str) => str.length

describe('wrapText', () => {
  it('возвращает одну строку если текст помещается', () => {
    expect(wrapText('hello world', 20, 12, measure)).toEqual(['hello world'])
  })

  it('переносит по границе слова', () => {
    expect(wrapText('hello world', 5, 12, measure)).toEqual(['hello', 'world'])
  })

  it('одно слово шире maxWidth — всё равно отдельная строка', () => {
    expect(wrapText('verylongword', 5, 12, measure)).toEqual(['verylongword'])
  })

  it('несколько слов — корректный перенос', () => {
    expect(wrapText('one two three four', 7, 12, measure)).toEqual(['one two', 'three', 'four'])
  })

  it('точная граница ширины — помещается в одну строку', () => {
    // 'abc def'.length === 7 === maxWidth
    expect(wrapText('abc def', 7, 12, measure)).toEqual(['abc def'])
  })
})
