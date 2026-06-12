import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import type { InstructorManagedCourse } from "../../models/courses";
import { ModerationCourseCard } from "./ModerationCourseCard";

const pendingCourse = {
  id: "course-1",
  title: "Cell Biology",
  instructor: "Ada Lovelace",
  category: "Biology",
  difficulty: "beginner",
  description: "A practical course about cells.",
  estimatedHours: 4,
  price: 49.99,
  progress: 0,
  totalLessons: 1,
  completedLessons: 0,
  duration: "4h",
  rating: 0,
  image: "",
  learningOutcomes: ["Describe cells"],
  topics: [],
  modules: [
    {
      id: "module-1",
      title: "Basics",
      lessons: [
        {
          id: "lesson-1",
          title: "Cells",
          duration: "10m",
          videoUrl: "https://example.com/video.mp4",
          quizAvailable: true,
          quizId: "quiz-1",
        },
      ],
    },
  ],
  publicationStatus: "pending-approval",
  createdAt: "2026-06-08T10:00:00.000Z",
  updatedAt: "2026-06-09T10:00:00.000Z",
  submittedAt: "2026-06-09T10:00:00.000Z",
  approvedAt: null,
  rejectionReason: null,
  isCustom: false,
} satisfies InstructorManagedCourse;

function renderCard(course: InstructorManagedCourse = pendingCourse) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(
      <ModerationCourseCard
        course={course}
        isSubmitting={false}
        rejectionNote=""
        onRejectionNoteChange={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );
  });

  return { host, root };
}

describe("ModerationCourseCard", () => {
  it("renders curriculum details for pending courses", () => {
    const { host } = renderCard();

    expect(host.textContent).toContain("Cell Biology");
    expect(host.textContent).toContain("$49.99");
    expect(host.textContent).toContain("Basics");
    expect(host.textContent).toContain("A practical course about cells.");
    expect(host.textContent).toContain("Approve");
    expect(host.textContent).toContain("Reject");
  });
});
