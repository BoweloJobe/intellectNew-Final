import { describe, expect, it } from "vitest";
import { MockCoursesAdapter } from "../courses.adapter";

describe("MockCoursesAdapter instructor drafts", () => {
  it("creates and lists local in-memory course drafts", async () => {
    const adapter = new MockCoursesAdapter();

    const created = await adapter.createInstructorCourse({
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A local mock draft for course authoring.",
      difficulty: "beginner",
      estimatedHours: 2,
      totalLessons: 0,
      initialStatus: "draft",
      price: 0,
    });

    expect(created.id).toMatch(/^mock-course-/);
    expect(created.publicationStatus).toBe("draft");
    await expect(adapter.getInstructorManagedCourses()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id, title: "Cell Biology" })]),
    );
  });

  it("edits local drafts enough to add modules and lessons", async () => {
    const adapter = new MockCoursesAdapter();
    const created = await adapter.createInstructorCourse({
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A local mock draft for course authoring.",
      difficulty: "beginner",
      totalLessons: 0,
      initialStatus: "draft",
      price: 0,
    });

    const updated = await adapter.editInstructorCourse({
      courseId: created.id,
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A local mock draft for course authoring.",
      difficulty: "beginner",
      estimatedHours: 3,
      totalLessons: 1,
      initialStatus: "draft",
      price: 0,
      modules: [
        {
          title: "Foundations",
          lessons: [
            {
              title: "Cells",
              videoUrl: "https://example.com/video.mp4",
              description: "Intro lesson",
              duration: "10m",
              estimatedCompletionTimeMinutes: 10,
              notesContent: "Notes",
              isFreePreview: true,
              quizAvailable: false,
            },
          ],
        },
      ],
    });

    expect(updated.totalLessons).toBe(1);
    expect(updated.modules[0].lessons[0].title).toBe("Cells");
  });

  it("keeps video uploads API-only in mock mode", async () => {
    const adapter = new MockCoursesAdapter();
    const file = new File(["video"], "lesson.mp4", { type: "video/mp4" });

    await expect(adapter.uploadLessonVideo({
      courseId: "course-1",
      moduleId: "module-1",
      lessonId: "lesson-1",
      file,
    })).rejects.toThrow("Video upload requires API mode");
  });

  it("adds standalone lessons to existing local drafts", async () => {
    const adapter = new MockCoursesAdapter();
    const created = await adapter.createInstructorCourse({
      title: "Cell Biology",
      instructor: "Ada Lovelace",
      category: "Biology",
      description: "A local mock draft for course authoring.",
      difficulty: "beginner",
      totalLessons: 0,
      initialStatus: "draft",
      price: 0,
    });

    const updated = await adapter.addStandaloneLesson({
      courseId: created.id,
      title: "New lesson",
    });

    expect(updated.modules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: "Standalone lessons",
        lessons: expect.arrayContaining([
          expect.objectContaining({ title: "New lesson" }),
        ]),
      }),
    ]));
    expect(updated.totalLessons).toBe(1);
  });
});
