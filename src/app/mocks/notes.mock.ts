import type { NoteSubmissionResult } from "../services/form-flows.service";

export const notesLibraryMock: NoteSubmissionResult[] = [
  {
    id: 1,
    title: "Cell Division Summary",
    content:
      "Key points about mitosis and meiosis, including phase checkpoints, spindle behavior, and how to distinguish each stage quickly during review.",
    course: "Advanced Biology",
    date: "Mar 20, 2026",
    tags: ["Biology", "Cell Structure"],
    starred: true,
  },
  {
    id: 2,
    title: "Chemical Bonding Notes",
    content:
      "Types of bonds: ionic, covalent, metallic, and how electronegativity changes the expected bond character across typical examples.",
    course: "Organic Chemistry",
    date: "Mar 18, 2026",
    tags: ["Chemistry", "Bonding"],
    starred: false,
  },
  {
    id: 3,
    title: "DNA Replication Process",
    content:
      "Step-by-step breakdown of DNA replication with helicase, primase, leading and lagging strand behavior, and exam cues to remember.",
    course: "Medical Genetics",
    date: "Mar 15, 2026",
    tags: ["Biology", "Genetics", "DNA"],
    starred: true,
  },
  {
    id: 4,
    title: "Quantum Mechanics Basics",
    content:
      "Fundamental principles and equations covering uncertainty, superposition, operators, and how to interpret common introductory problems.",
    course: "Quantum Physics",
    date: "Mar 12, 2026",
    tags: ["Physics", "Quantum"],
    starred: false,
  },
];
