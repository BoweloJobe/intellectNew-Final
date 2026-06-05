import { getRelatedLessons, getLessonsForCourse, lessonsMockById } from "../../../mocks/lessons.mock";
import type { CourseLesson, CourseModule, InstructorManagedCourse } from "../../../models/courses";
import type { VideoLesson } from "../../../models/lessons";
import { getAllMockManagedCourses, getMockManagedCourseById } from "./courses.adapter";
import type { LessonsService, VideoLessonPageData } from "../../contracts/lessons.contract";
import { LessonCourseMismatchError, LessonNotFoundError } from "../../contracts/lessons.contract";
import { withMockDelay } from "../../mock-utils";

function parseDurationToSeconds(label: string, fallbackMinutes: number): number {
  const minutesMatch = label.match(/(\d+)/);

  if (!minutesMatch) {
    return Math.max(1, fallbackMinutes) * 60;
  }

  const minutes = Number(minutesMatch[1]);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return Math.max(1, fallbackMinutes) * 60;
  }

  return minutes * 60;
}

function buildNotes(lesson: CourseLesson): VideoLesson["notes"] {
  const lessonNotes = lesson.notesContent?.trim() || `Notes for ${lesson.title}.`;

  return [{
    id: `${lesson.id}-note-1`,
    title: "Lesson Notes",
    content: lessonNotes,
  }];
}

function toVideoLesson(
  course: InstructorManagedCourse,
  module: CourseModule,
  lesson: CourseLesson,
  lessonOrder: number,
): VideoLesson {
  const estimatedCompletionTime = lesson.estimatedCompletionTimeMinutes
    ? Math.max(1, lesson.estimatedCompletionTimeMinutes)
    : 20;

  return {
    id: lesson.id,
    courseId: course.id,
    moduleId: module.id,
    title: lesson.title,
    description: lesson.description ?? `Lesson from module ${module.title}.`,
    videoUrl: lesson.videoUrl?.trim() || "",
    thumbnailUrl: course.image,
    duration: parseDurationToSeconds(lesson.duration, estimatedCompletionTime),
    lessonOrder,
    totalLessonsInModule: module.lessons.length,
    instructor: course.instructor,
    instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(course.instructor)}`,
    courseName: course.title,
    moduleName: module.title,
    difficulty: course.difficulty,
    estimatedCompletionTime,
    notes: buildNotes(lesson),
    learningObjectives: [
      {
        id: `${lesson.id}-objective-1`,
        text: lesson.description ?? `Understand ${lesson.title}.`,
      },
    ],
    summary: lesson.description ?? `Key concepts for ${lesson.title}.`,
    tags: [course.category, module.title],
    resources: [
      {
        title: `${lesson.title} Notes`,
        type: "document",
        url: "#",
      },
    ],
    quizAvailable: Boolean(lesson.quizAvailable),
    quizId: lesson.quizId,
    isFreePreview: Boolean(lesson.isFreePreview),
    aiPromptContext: `Learner is studying ${lesson.title} in ${course.title}.`,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    relatedLessonIds: module.lessons
      .filter((candidateLesson) => candidateLesson.id !== lesson.id)
      .map((candidateLesson) => candidateLesson.id),
    isCompleted: false,
    watchedDuration: 0,
  };
}

function buildCustomCourseLessons(course: InstructorManagedCourse): VideoLesson[] {
  let lessonOrder = 0;

  return course.modules.flatMap((module) => module.lessons.map((lesson) => {
    lessonOrder += 1;
    return toVideoLesson(course, module, lesson, lessonOrder);
  }));
}

function getCustomCourseLessons(courseId: string): VideoLesson[] {
  const managedCourse = getMockManagedCourseById(courseId);

  if (!managedCourse?.isCustom) {
    return [];
  }

  return buildCustomCourseLessons(managedCourse);
}

function findCustomLessonById(lessonId: string): VideoLesson | null {
  const customCourses = getAllMockManagedCourses().filter((course) => course.isCustom);

  for (const customCourse of customCourses) {
    const customLesson = buildCustomCourseLessons(customCourse).find((lesson) => lesson.id === lessonId);

    if (customLesson) {
      return customLesson;
    }
  }

  return null;
}

function getFurtherFromCourseLessons(lesson: VideoLesson, courseLessons: VideoLesson[]): VideoLesson[] {
  const sameModule = courseLessons.filter((candidate) => (
    candidate.moduleId === lesson.moduleId && candidate.id !== lesson.id
  ));

  if (sameModule.length > 0) {
    return sameModule;
  }

  return courseLessons.filter((candidate) => candidate.id !== lesson.id).slice(0, 6);
}

export class MockLessonsAdapter implements LessonsService {
  async getVideoLessonData(lessonId: string) {
    const staticLesson = lessonsMockById[lessonId];

    if (staticLesson) {
      return withMockDelay(staticLesson);
    }

    const matched = findCustomLessonById(lessonId);

    if (!matched) {
      throw new LessonNotFoundError(lessonId);
    }

    return withMockDelay(matched);
  }

  async getCourseLessons(courseId: string) {
    const staticLessons = getLessonsForCourse(courseId);

    if (staticLessons.length > 0) {
      return withMockDelay(staticLessons.sort((left, right) => left.lessonOrder - right.lessonOrder));
    }

    const customLessons = getCustomCourseLessons(courseId);
    return withMockDelay(customLessons);
  }

  async getFurtherLessons(lessonId: string) {
    const staticLesson = lessonsMockById[lessonId];

    if (staticLesson) {
      const relatedLessons = getRelatedLessons(lessonId);
      return withMockDelay(relatedLessons);
    }

    const customLesson = findCustomLessonById(lessonId);

    if (!customLesson) {
      return withMockDelay([]);
    }

    const customCourseLessons = getCustomCourseLessons(customLesson.courseId);
    return withMockDelay(getFurtherFromCourseLessons(customLesson, customCourseLessons));
  }

  async getLessonNotes(lessonId: string) {
    const staticLesson = lessonsMockById[lessonId];

    if (staticLesson) {
      return withMockDelay(staticLesson.notes);
    }

    const customLesson = findCustomLessonById(lessonId);

    if (customLesson) {
      return withMockDelay(customLesson.notes);
    }

    throw new LessonNotFoundError(lessonId);
  }

  async completeLessonVideo(_lessonId: string, _courseId: string): Promise<void> {
    await withMockDelay(null, 200);
  }

  async trackLessonProgress(_lessonId: string, _courseId: string, _watchedDuration: number): Promise<void> {
    await withMockDelay(null, 100);
  }

  async getVideoLessonPageData(courseId: string, lessonId: string): Promise<VideoLessonPageData> {
    const [courseLessons, staticLesson] = await Promise.all([
      this.getCourseLessons(courseId),
      this.getVideoLessonData(lessonId).catch(() => null),
    ]);

    const lesson = courseLessons.find((candidate) => candidate.id === lessonId) ?? staticLesson;

    if (!lesson) {
      throw new LessonNotFoundError(lessonId);
    }

    if (lesson.courseId !== courseId) {
      throw new LessonCourseMismatchError(lessonId, courseId);
    }

    const furtherLessons = getFurtherFromCourseLessons(lesson, courseLessons);

    return {
      lesson,
      furtherLessons,
      courseLessons,
    };
  }
}
