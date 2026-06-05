import { getCoursesPageData } from "../services/courses.service";
import { getCourseLessons } from "../services/lessons.service";
import { getNotesLibrary } from "../services/notes.service";

export type GlobalSearchItemType = "course" | "lesson" | "quiz" | "note";

export interface GlobalSearchItem {
  id: string;
  type: GlobalSearchItemType;
  title: string;
  subtitle: string;
  secondaryText?: string;
  to: string;
  searchableText: string;
  score: number;
}

export const MAX_GLOBAL_SEARCH_RESULTS = 8;
export const MIN_GLOBAL_SEARCH_SCORE = 24;
export const MIN_GLOBAL_SEARCH_QUERY_LENGTH = 2;

export function normalizeSearchText(input: string): string {
  return input.trim().toLowerCase();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWordBoundaryMatch(text: string, token: string): boolean {
  if (!token) {
    return false;
  }

  return new RegExp(`\\b${escapeRegExp(token)}`, "i").test(text);
}

export function getTypePriority(type: GlobalSearchItemType): number {
  if (type === "course") return 4;
  if (type === "lesson") return 3;
  if (type === "quiz") return 2;
  return 1;
}

export function getSearchScore(item: GlobalSearchItem, normalizedQuery: string): number {
  const normalizedTitle = normalizeSearchText(item.title);
  const normalizedSubtitle = normalizeSearchText(item.subtitle);
  const normalizedSecondary = normalizeSearchText(item.secondaryText ?? "");
  const normalizedSearchable = normalizeSearchText(item.searchableText);
  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0);

  if (queryTokens.length === 0) {
    return 0;
  }

  let score = 0;
  let matchedTokenCount = 0;
  let matchedTitleTokenCount = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 180;
  } else if (normalizedTitle.startsWith(normalizedQuery)) {
    score += 120;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 80;
  }

  if (normalizedSubtitle.includes(normalizedQuery)) {
    score += 30;
  }

  if (normalizedSecondary.includes(normalizedQuery)) {
    score += 18;
  }

  for (const token of queryTokens) {
    let tokenMatched = false;

    if (normalizedTitle.includes(token)) {
      score += hasWordBoundaryMatch(normalizedTitle, token) ? 32 : 24;
      tokenMatched = true;
      matchedTitleTokenCount += 1;
    }

    if (normalizedSubtitle.includes(token)) {
      score += hasWordBoundaryMatch(normalizedSubtitle, token) ? 16 : 10;
      tokenMatched = true;
    }

    if (normalizedSecondary.includes(token)) {
      score += hasWordBoundaryMatch(normalizedSecondary, token) ? 12 : 8;
      tokenMatched = true;
    }

    if (!tokenMatched && normalizedSearchable.includes(token)) {
      score += 4;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTokenCount += 1;
    }
  }

  const minimumMatchedTokens = queryTokens.length === 1 ? 1 : Math.ceil(queryTokens.length * 0.6);

  if (matchedTokenCount < minimumMatchedTokens) {
    return 0;
  }

  if (matchedTitleTokenCount === 0 && queryTokens.length > 1) {
    score -= 16;
  }

  score += getTypePriority(item.type) * 4;

  return score;
}

export function rankSearchResults(
  catalog: GlobalSearchItem[],
  query: string,
): GlobalSearchItem[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery || normalizedQuery.length < MIN_GLOBAL_SEARCH_QUERY_LENGTH) {
    return [];
  }

  const results = catalog
    .map((item) => {
      const score = getSearchScore(item, normalizedQuery);
      if (score < MIN_GLOBAL_SEARCH_SCORE) {
        return null;
      }
      return { ...item, score };
    })
    .filter((item): item is GlobalSearchItem => item !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      const typeDelta = getTypePriority(right.type) - getTypePriority(left.type);
      if (typeDelta !== 0) {
        return typeDelta;
      }
      return left.title.localeCompare(right.title);
    });

  return results.slice(0, MAX_GLOBAL_SEARCH_RESULTS);
}

export function getSuggestedItems(catalog: GlobalSearchItem[], limit = 5): GlobalSearchItem[] {
  return catalog
    .slice()
    .sort((left, right) => {
      const typeDelta = getTypePriority(right.type) - getTypePriority(left.type);
      if (typeDelta !== 0) {
        return typeDelta;
      }
      return left.title.localeCompare(right.title);
    })
    .slice(0, limit);
}

let _catalogCache: GlobalSearchItem[] | null = null;

export function invalidateSearchCatalog(): void {
  _catalogCache = null;
}

export async function buildSearchCatalog(): Promise<GlobalSearchItem[]> {
  if (_catalogCache !== null) {
    return _catalogCache;
  }

  const [coursesPageData, notesLibrary] = await Promise.all([
    getCoursesPageData(),
    getNotesLibrary(),
  ]);

  const lessonsByCourse = await Promise.all(
    coursesPageData.courses.map(async (course) => {
      try {
        return await getCourseLessons(course.id);
      } catch {
        return [];
      }
    }),
  );

  const flattenedLessons = lessonsByCourse.flat();

  const courseItems: GlobalSearchItem[] = coursesPageData.courses.map((course) => ({
    id: `course-${course.id}`,
    type: "course",
    title: course.title,
    subtitle: `${course.category} course`,
    secondaryText: `${course.instructor} ${course.duration}`,
    to: `/courses/${course.id}`,
    searchableText: `${course.title} ${course.instructor} ${course.category}`,
    score: 0,
  }));

  const lessonItems: GlobalSearchItem[] = flattenedLessons.map((lesson) => ({
    id: `lesson-${lesson.id}`,
    type: "lesson",
    title: lesson.title,
    subtitle: `${lesson.courseName} \u2022 ${lesson.moduleName}`,
    secondaryText: `${lesson.instructor} ${lesson.tags.join(" ")}`,
    to: `/courses/${lesson.courseId}/lessons/${lesson.id}`,
    searchableText: `${lesson.title} ${lesson.courseName} ${lesson.moduleName} ${lesson.tags.join(" ")}`,
    score: 0,
  }));

  const quizItems: GlobalSearchItem[] = flattenedLessons
    .filter((lesson) => lesson.quizAvailable && lesson.quizId)
    .map((lesson) => ({
      id: `quiz-${lesson.quizId}`,
      type: "quiz",
      title: `${lesson.title} Quiz`,
      subtitle: `${lesson.courseName} \u2022 ${lesson.moduleName}`,
      secondaryText: lesson.difficulty,
      to: `/quizzes?quizId=${encodeURIComponent(lesson.quizId ?? "")}&lessonId=${encodeURIComponent(lesson.id)}&courseId=${lesson.courseId}`,
      searchableText: `${lesson.title} quiz ${lesson.courseName} ${lesson.moduleName} ${lesson.tags.join(" ")}`,
      score: 0,
    }));

  const noteItems: GlobalSearchItem[] = notesLibrary.map((note) => ({
    id: `note-${note.id}`,
    type: "note",
    title: note.title,
    subtitle: `${note.course} \u2022 ${note.date}`,
    secondaryText: note.tags.join(" "),
    to: `/notes?search=${encodeURIComponent(note.title)}&noteId=${note.id}`,
    searchableText: `${note.title} ${note.course} ${note.tags.join(" ")}`,
    score: 0,
  }));

  _catalogCache = [...courseItems, ...lessonItems, ...quizItems, ...noteItems];
  return _catalogCache;
}
