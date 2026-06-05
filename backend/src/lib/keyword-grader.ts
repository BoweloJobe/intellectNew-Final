/**
 * Keyword-based self-grading for SHORT_ANSWER quiz questions.
 *
 * Instructor format: comma-separated keywords in the answerKey field.
 *   Example: "photosynthesis, chlorophyll, light energy, glucose"
 *
 * Each keyword represents one mark.
 * Matching is case-insensitive with whole-word boundary for single words,
 * and substring for multi-word phrases.
 * A keyword found multiple times in the student answer still counts as one mark.
 */

/** Escape special regex characters in a string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Parse the instructor's answerKey into a normalised, deduplicated keyword list.
 * Returns an empty array for null/empty answerKey.
 */
export function parseKeywords(answerKey: string | null | undefined): string[] {
  if (!answerKey || !answerKey.trim()) return []

  return answerKey
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0)
    .filter((k, i, arr) => arr.indexOf(k) === i) // deduplicate
}

/**
 * Count how many of the provided keywords appear in the student's answer.
 *
 * Rules:
 * - Case-insensitive.
 * - Single-word keywords use word-boundary matching (prevents partial matches).
 * - Multi-word phrases use exact substring matching (case-insensitive).
 * - Each keyword is counted at most once, regardless of how many times
 *   the student repeats it (prevents keyword-stuffing).
 */
export function gradeKeywords(
  studentAnswer: string,
  keywords: string[],
): { marksAwarded: number; matchedKeywords: string[] } {
  if (keywords.length === 0) {
    return { marksAwarded: 0, matchedKeywords: [] }
  }

  const normalised = studentAnswer.toLowerCase()
  const matchedKeywords: string[] = []

  for (const keyword of keywords) {
    const matched = keyword.includes(' ')
      ? normalised.includes(keyword)
      : new RegExp(`\\b${escapeRegex(keyword)}\\b`).test(normalised)

    if (matched) {
      matchedKeywords.push(keyword)
    }
  }

  return { marksAwarded: matchedKeywords.length, matchedKeywords }
}
