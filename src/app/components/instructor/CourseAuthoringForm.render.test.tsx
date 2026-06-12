import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { CourseAuthoringForm } from "./CourseAuthoringForm";
import type { InstructorManagedCourse } from "../../models/courses";

function renderForm(editingCourse?: InstructorManagedCourse) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  act(() => {
    root.render(
      <CourseAuthoringForm
        isSubmitting={false}
        isEditing={Boolean(editingCourse)}
        editingCourse={editingCourse}
        availableCategories={["Biology"]}
        instructorName="Ada Lovelace"
        onSubmit={vi.fn()}
      />,
    );
  });

  return { host, root };
}

const editingCourse: InstructorManagedCourse = {
  id: "course-1",
  title: "Cell Biology",
  instructor: "Ada Lovelace",
  progress: 0,
  totalLessons: 0,
  completedLessons: 0,
  duration: "2h",
  rating: 0,
  category: "Biology",
  image: "",
  difficulty: "beginner",
  description: "A course about cells.",
  estimatedHours: 2,
  coverImageUrl: "https://example.com/cover.jpg",
  price: 0,
  learningOutcomes: [],
  topics: [],
  modules: [],
  publicationStatus: "approved",
  createdAt: "2026-06-12T10:00:00.000Z",
  updatedAt: "2026-06-12T10:00:00.000Z",
  submittedAt: null,
  approvedAt: "2026-06-12T10:00:00.000Z",
  rejectionReason: null,
  isCustom: false,
};

describe("CourseAuthoringForm fields", () => {
  it("does not show course duration or cover URL fields during creation", () => {
    const { host, root } = renderForm();

    expect(host.textContent).not.toContain("Estimated Hours");
    expect(host.textContent).not.toContain("Cover Image URL");

    act(() => root.unmount());
    host.remove();
  });

  it("does not show course duration or cover URL fields during editing", () => {
    const { host, root } = renderForm(editingCourse);

    expect(host.textContent).not.toContain("Estimated Hours");
    expect(host.textContent).not.toContain("Cover Image URL");

    act(() => root.unmount());
    host.remove();
  });
});
