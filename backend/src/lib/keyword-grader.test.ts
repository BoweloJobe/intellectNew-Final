import { describe, expect, it } from 'vitest'
import { gradeKeywords, parseKeywords } from './keyword-grader.js'

describe('keyword-grader', () => {
  it('normalizes keyword casing, spacing, punctuation, and accents', () => {
    const keywords = parseKeywords('Light energy; chlorophyll\ncafé pigment')

    expect(keywords).toEqual(['light energy', 'chlorophyll', 'cafe pigment'])
    expect(gradeKeywords('The CAFE   pigment uses LIGHT-energy with chlorophyll.', keywords)).toEqual({
      marksAwarded: 3,
      matchedKeywords: ['light energy', 'chlorophyll', 'cafe pigment'],
    })
  })

  it('does not match unrelated partial words', () => {
    const keywords = parseKeywords('ion, cell')

    expect(gradeKeywords('The question mentions collection and cellularity.', keywords)).toEqual({
      marksAwarded: 0,
      matchedKeywords: [],
    })
  })
})
