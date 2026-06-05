import type { TutorPageData } from "../models/tutor";

export const tutorPageMock: TutorPageData = {
  sessions: [
    {
      id: "session-dna-revision",
      title: "DNA replication revision",
      status: "active",
      tags: [
        { id: "tag-course-bio", type: "course", label: "Advanced Biology" },
        { id: "tag-topic-dna", type: "topic", label: "DNA Replication" },
      ],
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "Welcome back. Do you want a quick recall drill or a step-by-step concept explanation?",
          createdAt: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
        },
        {
          id: "msg-2",
          role: "user",
          content: "Give me a quick recall drill first.",
          createdAt: new Date(Date.now() - 1000 * 60 * 54).toISOString(),
        },
        {
          id: "msg-3",
          role: "assistant",
          content: "Great. Name the enzyme that unwinds DNA, the enzyme that builds primers, and the reason Okazaki fragments exist.",
          createdAt: new Date(Date.now() - 1000 * 60 * 53).toISOString(),
        },
      ],
      takeaways: [
        "Helicase unwinds DNA; primase lays RNA primers.",
        "Lagging strand forms Okazaki fragments due to antiparallel directionality.",
      ],
      updatedAt: new Date(Date.now() - 1000 * 60 * 53).toISOString(),
    },
    {
      id: "session-chem-bonding",
      title: "Chemical bonding confusion",
      status: "pinned",
      tags: [
        { id: "tag-course-chem", type: "course", label: "Organic Chemistry" },
        { id: "tag-topic-bonds", type: "topic", label: "Chemical Bonding" },
      ],
      messages: [
        {
          id: "msg-4",
          role: "assistant",
          content: "Let us compare ionic, polar covalent, and non-polar covalent with electronegativity thresholds.",
          createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        },
      ],
      takeaways: [
        "Use electronegativity difference as a quick first-pass heuristic.",
      ],
      updatedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
    {
      id: "session-archived-study-plan",
      title: "Biology study plan week 3",
      status: "archived",
      tags: [
        { id: "tag-course-bio-2", type: "course", label: "Advanced Biology" },
        { id: "tag-topic-planning", type: "topic", label: "Study Planning" },
      ],
      messages: [
        {
          id: "msg-5",
          role: "assistant",
          content: "You completed your week 3 goals. Archive this and start week 4 with quiz-heavy sessions.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        },
      ],
      takeaways: [
        "Short daily quizzes improved recall more than long review blocks.",
      ],
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
  ],
  suggestedPrompts: [
    {
      id: "prompt-dna",
      label: "Explain DNA replication",
      icon: "book",
      text: "Explain DNA replication like I am preparing for an exam tomorrow. Include checkpoints and common mistakes.",
      tags: [
        { id: "tag-course-bio-3", type: "course", label: "Advanced Biology" },
        { id: "tag-topic-dna-2", type: "topic", label: "DNA Replication" },
      ],
    },
    {
      id: "prompt-plan",
      label: "Create a study plan",
      icon: "plan",
      text: "Create a 5-day study plan for Biology focused on weak topics and spaced revision.",
      tags: [
        { id: "tag-course-bio-4", type: "course", label: "Advanced Biology" },
        { id: "tag-topic-plan", type: "topic", label: "Study Planning" },
      ],
    },
    {
      id: "prompt-bonding",
      label: "Help with chemical bonding",
      icon: "help",
      text: "Help me distinguish ionic vs covalent vs polar covalent quickly in MCQ questions.",
      tags: [
        { id: "tag-course-chem-2", type: "course", label: "Organic Chemistry" },
        { id: "tag-topic-bonding-2", type: "topic", label: "Chemical Bonding" },
      ],
    },
    {
      id: "prompt-practice",
      label: "Generate practice questions",
      icon: "sparkles",
      text: "Generate 8 mixed-difficulty practice questions from my current Biology module with short explanations.",
      tags: [
        { id: "tag-course-bio-5", type: "course", label: "Advanced Biology" },
        { id: "tag-topic-practice", type: "topic", label: "Practice Questions" },
      ],
    },
  ],
};
