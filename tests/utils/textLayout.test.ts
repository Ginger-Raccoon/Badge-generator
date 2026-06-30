import { describe, it, expect } from 'vitest'
import { wrapText, splitValue } from '../../src/renderer/utils/textLayout'

// measureFn: длина строки в символах (каждый символ = 1 единица)
const measure = (str: string, _size: number) => str.length

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

  it('пустая строка возвращает массив с одной пустой строкой', () => {
    expect(wrapText('', 20, 12, measure)).toEqual([''])
  })
})

describe('splitValue', () => {
  it('splitIndex null — возвращает полное значение', () => {
    expect(splitValue('Иванов, Иван', null, '', ',')).toBe('Иванов, Иван')
  })

  it('column splitChar, index 0', () => {
    expect(splitValue('Иванов, Иван', 0, '', ',')).toBe('Иванов')
  })

  it('column splitChar, index 1', () => {
    expect(splitValue('Иванов, Иван', 1, '', ',')).toBe(' Иван')
  })

  it('zone splitChar перекрывает column splitChar', () => {
    expect(splitValue('a|b', 0, '|', ',')).toBe('a')
  })

  it('несуществующий index — возвращает пустую строку', () => {
    expect(splitValue('Иванов', 2, '', ',')).toBe('')
  })

  it('нет символа (ни zone, ни column) — возвращает полное значение', () => {
    expect(splitValue('Иванов, Иван', 0, '', '')).toBe('Иванов, Иван')
  })
})
