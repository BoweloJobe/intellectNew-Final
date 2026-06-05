import type { VideoLesson } from "../models/lessons";

export const lessonsMockById: Record<string, VideoLesson> = {
  // Biology Course - Advanced Biology
  "bio-l1": {
    id: "bio-l1",
    courseId: "1",
    moduleId: "bio-m1",
    title: "What is Biology?",
    description:
      "An introduction to the scope and scale of biology, from molecules to ecosystems. Learn what makes something alive, the basic characteristics of living organisms, and why biology matters.",
    videoUrl: "https://www.youtube.com/embed/iWn1Hy0nWKE?si=zmw0Cp6YLSFzQO_5",
    thumbnailUrl: "🧬",
    duration: 720, // 12 minutes
    lessonOrder: 1,
    totalLessonsInModule: 3,
    instructor: "Dr. Sarah Williams",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    courseName: "Advanced Biology",
    moduleName: "Introduction to Biology",
    difficulty: "beginner",
    estimatedCompletionTime: 20,
    notes: [
      {
        id: "note-1",
        title: "Key definitions",
        content:
          "Biology is the study of living organisms. Life has characteristics: organization, growth, metabolism, homeostasis, and reproduction.",
      },
      {
        id: "note-2",
        title: "Scope of biology",
        content:
          "Biology spans from molecular level (atoms) to ecosystem level. Includes: cellular, organismal, population, and community biology.",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Define biology and explain its major branches",
        completed: true,
      },
      {
        id: "obj-2",
        text: "Identify the characteristics that define life",
      },
      {
        id: "obj-3",
        text: "Understand the hierarchy of biological organization",
      },
    ],
    summary:
      "This foundational lesson introduces biology as a scientific discipline and explores the unifying characteristics of all living systems.",
    tags: ["Introduction", "Fundamentals", "Biology"],
    resources: [
      {
        title: "Course Syllabus",
        type: "pdf",
        url: "#",
      },
      {
        title: "Biology Reading Guide",
        type: "document",
        url: "#",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-bio-1",
    aiPromptContext:
      "The student just learned about the definition of biology and characteristics of life. They might have questions about organisms, living systems, or biological organization.",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    relatedLessonIds: ["bio-l2", "bio-l3"],
    isCompleted: true,
    watchedDuration: 720,
  },
  "bio-l2": {
    id: "bio-l2",
    courseId: "1",
    moduleId: "bio-m1",
    title: "Cell Theory",
    description:
      "Explore the fundamental principles of cell theory: all organisms are made of cells, cells are the basic unit of life, and all cells come from pre-existing cells.",
    videoUrl: "https://www.youtube.com/embed/tKiPZfXPQWI?si=1l2UpPWlJH8vWjnZ",
    thumbnailUrl: "🧬",
    duration: 900, // 15 minutes
    lessonOrder: 2,
    totalLessonsInModule: 3,
    instructor: "Dr. Sarah Williams",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    courseName: "Advanced Biology",
    moduleName: "Introduction to Biology",
    difficulty: "beginner",
    estimatedCompletionTime: 25,
    notes: [
      {
        id: "note-1",
        title: "Three postulates of cell theory",
        content:
          "1. All living organisms are composed of one or more cells\n2. The cell is the basic unit of life\n3. All cells arise from pre-existing cells",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "State the three main principles of cell theory",
      },
      {
        id: "obj-2",
        text: "Explain why cells are considered the basic unit of life",
      },
      {
        id: "obj-3",
        text: "Apply cell theory concepts to different organisms",
      },
    ],
    summary:
      "Cell theory is a unifying concept in biology that explains the structure and function of all living organisms.",
    tags: ["Cells", "Fundamentals", "Theory"],
    resources: [
      {
        title: "Cell Theory Timeline",
        type: "pdf",
        url: "#",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-bio-2",
    aiPromptContext:
      "The student just learned about cell theory. Good follow-up topics: prokaryotic vs eukaryotic cells, cell compartmentalization.",
    createdAt: "2024-01-15T11:00:00Z",
    updatedAt: "2024-01-15T11:00:00Z",
    relatedLessonIds: ["bio-l1", "bio-l3", "bio-l4"],
    isCompleted: true,
    watchedDuration: 600,
  },
  "bio-l3": {
    id: "bio-l3",
    courseId: "1",
    moduleId: "bio-m1",
    title: "Basic Chemistry",
    description:
      "Essential chemistry concepts for biology: atoms, molecules, bonding, water, and its properties. Understanding chemistry is fundamental to understanding biochemistry and cellular processes.",
    videoUrl: "https://www.youtube.com/embed/_K5vYsoGkfA?si=LQ_LYhYVkQDBWPLJ",
    thumbnailUrl: "🧬",
    duration: 1080, // 18 minutes
    lessonOrder: 3,
    totalLessonsInModule: 3,
    instructor: "Dr. Sarah Williams",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    courseName: "Advanced Biology",
    moduleName: "Introduction to Biology",
    difficulty: "beginner",
    estimatedCompletionTime: 30,
    notes: [
      {
        id: "note-1",
        title: "Key chemical concepts",
        content:
          "Atoms: basic units of matter\nMolecules: two or more atoms bonded together\nIons: charged atoms\nWater: polar molecule with hydrogen bonds",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Identify atomic structure and electron configuration",
      },
      {
        id: "obj-2",
        text: "Explain chemical bonding types",
      },
      {
        id: "obj-3",
        text: "Describe properties of water and their biological significance",
      },
    ],
    summary:
      "Chemical principles underlie all biological processes. This lesson covers atoms, molecules, bonding, and water properties essential for biology.",
    tags: ["Chemistry", "Fundamentals", "Atoms"],
    resources: [
      {
        title: "Chemistry Reference Sheet",
        type: "pdf",
        url: "#",
      },
      {
        title: "Periodic Table",
        type: "link",
        url: "/resources/periodic-table",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-bio-3",
    aiPromptContext:
      "The student is learning basic chemistry for biology. They might need help with: bonding types, water properties, organic molecules.",
    createdAt: "2024-01-15T12:00:00Z",
    updatedAt: "2024-01-15T12:00:00Z",
    relatedLessonIds: ["bio-l1", "bio-l2"],
    isCompleted: false,
    watchedDuration: 0,
  },
  "bio-l4": {
    id: "bio-l4",
    courseId: "1",
    moduleId: "bio-m2",
    title: "Cell Membrane",
    description:
      "Dive deep into the cell membrane structure (phospholipid bilayer), membrane proteins, and their functions. Learn how selective permeability regulates what enters and exits the cell.",
    videoUrl: "https://www.youtube.com/embed/4MgCtzBu7Ts?si=aZvX6zXXZqUnrV_N",
    thumbnailUrl: "🧬",
    duration: 1200, // 20 minutes
    lessonOrder: 4,
    totalLessonsInModule: 3,
    instructor: "Dr. Sarah Williams",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    courseName: "Advanced Biology",
    moduleName: "Cell Structure",
    difficulty: "intermediate",
    estimatedCompletionTime: 35,
    notes: [
      {
        id: "note-1",
        title: "Membrane structure",
        content:
          "Phospholipid bilayer forms the foundation. Hydrophobic tails face inward, hydrophilic heads face outward. Proteins, cholesterol embedded in membrane.",
      },
      {
        id: "note-2",
        title: "Membrane functions",
        content: "Protection, transport, cell recognition, signaling, enzyme activity.",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Describe the structure of the cell membrane",
      },
      {
        id: "obj-2",
        text: "Explain the role of membrane proteins",
      },
      {
        id: "obj-3",
        text: "Understand selective permeability and transport mechanisms",
      },
    ],
    summary:
      "The cell membrane is a dynamic barrier that controls what enters and exits the cell. Understanding its structure and function is crucial for cellular biology.",
    tags: ["Cell Structure", "Membrane", "Intermediate"],
    resources: [
      {
        title: "Membrane Transport Diagram",
        type: "pdf",
        url: "#",
      },
      {
        title: "Fluid Mosaic Model Explanation",
        type: "document",
        url: "#",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-bio-4",
    aiPromptContext:
      "Student is learning about cell membranes. Can discuss: transport types, channel proteins, diffusion, osmosis, active transport.",
    createdAt: "2024-01-16T10:00:00Z",
    updatedAt: "2024-01-16T10:00:00Z",
    relatedLessonIds: ["bio-l2", "bio-l5", "bio-l6"],
    isCompleted: false,
    watchedDuration: 0,
  },
  "bio-l5": {
    id: "bio-l5",
    courseId: "1",
    moduleId: "bio-m2",
    title: "Nucleus & Organelles",
    description:
      "Explore the nucleus and its role in heredity, plus major eukaryotic organelles: mitochondria, endoplasmic reticulum, Golgi apparatus, lysosomes, and more.",
    videoUrl: "https://www.youtube.com/embed/BR3Y0fN8P7Q?si=Pxjv5xQzjzUj7jCF",
    thumbnailUrl: "🧬",
    duration: 1500, // 25 minutes
    lessonOrder: 5,
    totalLessonsInModule: 3,
    instructor: "Dr. Sarah Williams",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
    courseName: "Advanced Biology",
    moduleName: "Cell Structure",
    difficulty: "intermediate",
    estimatedCompletionTime: 40,
    notes: [
      {
        id: "note-1",
        title: "Nuclear structure",
        content:
          "Nucleus contains DNA. Nuclear envelope controls access. Nucleolus synthesizes ribosomal RNA.",
      },
      {
        id: "note-2",
        title: "Major organelles",
        content:
          "Mitochondria: ATP production\nER: protein synthesis & lipid synthesis\nGolgi: protein modification & packaging\nLysosomes: digestion\nPeroxisomes: detoxification",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Describe the structure and function of the nucleus",
      },
      {
        id: "obj-2",
        text: "Identify and explain the function of major organelles",
      },
      {
        id: "obj-3",
        text: "Understand organellar relationships in the endomembrane system",
      },
    ],
    summary:
      "Eukaryotic cells contain membrane-bound organelles that compartmentalize cellular functions. Each organelle has specific roles in cellular metabolism and regulation.",
    tags: ["Cell Structure", "Organelles", "Eukaryotic Cells"],
    resources: [
      {
        title: "Organelle Summary Chart",
        type: "pdf",
        url: "#",
      },
      {
        title: "Cell Anatomy Diagram",
        type: "document",
        url: "#",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-bio-5",
    aiPromptContext:
      "Student learning about organelles. Good topics: how organelles work together, energy production, protein synthesis pathway.",
    createdAt: "2024-01-16T11:00:00Z",
    updatedAt: "2024-01-16T11:00:00Z",
    relatedLessonIds: ["bio-l4", "bio-l6"],
    isCompleted: false,
    watchedDuration: 0,
  },

  // Chemistry Course - Organic Chemistry
  "org-l1": {
    id: "org-l1",
    courseId: "2",
    moduleId: "org-m1",
    title: "Bonding Review",
    description:
      "Refresher on chemical bonding essential for organic chemistry: ionic, covalent, and coordinate covalent bonds. Understanding bond formation and breaking is critical for reaction mechanisms.",
    videoUrl: "https://www.youtube.com/embed/sYrLMvV_F-I?si=fwI5h0rNvGz5J9Qy",
    thumbnailUrl: "⚗️",
    duration: 960, // 16 minutes
    lessonOrder: 1,
    totalLessonsInModule: 3,
    instructor: "Prof. Michael Chen",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    courseName: "Organic Chemistry",
    moduleName: "Foundations",
    difficulty: "beginner",
    estimatedCompletionTime: 25,
    notes: [
      {
        id: "note-1",
        title: "Bond types",
        content:
          "Ionic: electrons transferred, holds oppositely charged ions\nCovalent: electrons shared\nPolar covalent: unequal electron sharing\nCoordinate: both electrons from donor",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Distinguish between ionic and covalent bonding",
      },
      {
        id: "obj-2",
        text: "Understand electronegativity and its effects",
      },
      {
        id: "obj-3",
        text: "Apply bonding concepts to organic molecules",
      },
    ],
    summary:
      "Chemical bonds are the foundation of organic chemistry. This review covers bond types and electron behavior essential for understanding reaction mechanisms.",
    tags: ["Bonding", "Fundamentals", "Review"],
    resources: [
      {
        title: "Bonding Chart Reference",
        type: "pdf",
        url: "#",
      },
      {
        title: "Electronegativity Table",
        type: "link",
        url: "/resources/electronegativity",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-org-1",
    aiPromptContext:
      "Student reviewing bonding. Can discuss: electronegativity, bond polarity, Lewis structures, formal charges.",
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-01T10:00:00Z",
    relatedLessonIds: ["org-l2", "org-l3"],
    isCompleted: true,
    watchedDuration: 960,
  },
  "org-l2": {
    id: "org-l2",
    courseId: "2",
    moduleId: "org-m1",
    title: "Functional Groups",
    description:
      "Master the major functional groups in organic chemistry: alkanes, alkenes, alkynes, alcohols, ethers, aldehydes, ketones, carboxylic acids, and amines. Functional groups determine molecular properties and reactivity.",
    videoUrl: "https://www.youtube.com/embed/ScFPSKo9fPY?si=JX4sD7YpE6e2qA5q",
    thumbnailUrl: "⚗️",
    duration: 1140, // 19 minutes
    lessonOrder: 2,
    totalLessonsInModule: 3,
    instructor: "Prof. Michael Chen",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    courseName: "Organic Chemistry",
    moduleName: "Foundations",
    difficulty: "intermediate",
    estimatedCompletionTime: 30,
    notes: [
      {
        id: "note-1",
        title: "Functional group categories",
        content:
          "Hydrocarbons: alkanes (C-C), alkenes (C=C), alkynes (C≡C)\nOxygen-containing: alcohols (-OH), ethers (R-O-R), carbonyls (C=O), carboxylic acids (-COOH)\nNitrogen-containing: amines (-NH2, -NR2), amides (-CONH2)",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Identify and name functional groups in organic molecules",
      },
      {
        id: "obj-2",
        text: "Relate functional groups to reactivity",
      },
      {
        id: "obj-3",
        text: "Predict reaction sites based on functional groups",
      },
    ],
    summary:
      "Functional groups are the key character traits of molecules. Understanding them allows you to predict and explain organic reactions.",
    tags: ["Functional Groups", "Structure", "Nomenclature"],
    resources: [
      {
        title: "Functional Groups Poster",
        type: "pdf",
        url: "#",
      },
      {
        title: "Priority Rules for Nomenclature",
        type: "document",
        url: "#",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-org-2",
    aiPromptContext:
      "Student learning functional groups. Topics: IUPAC nomenclature, priority rules, functional group reactivity.",
    createdAt: "2024-02-01T11:00:00Z",
    updatedAt: "2024-02-01T11:00:00Z",
    relatedLessonIds: ["org-l1", "org-l3"],
    isCompleted: false,
    watchedDuration: 450,
  },
  "org-l3": {
    id: "org-l3",
    courseId: "2",
    moduleId: "org-m1",
    title: "Acid-Base Principles",
    description:
      "Deep dive into acid-base chemistry: Brønsted-Lowry theory, pKa, pH, buffers, and conjugate acid-base pairs. Acid-base chemistry is central to organic mechanisms and biological processes.",
    videoUrl: "https://www.youtube.com/embed/0qVEUV-lCCk?si=bZ0pxC5MLF_YjLeq",
    thumbnailUrl: "⚗️",
    duration: 1080, // 18 minutes
    lessonOrder: 3,
    totalLessonsInModule: 3,
    instructor: "Prof. Michael Chen",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=michael",
    courseName: "Organic Chemistry",
    moduleName: "Foundations",
    difficulty: "intermediate",
    estimatedCompletionTime: 30,
    notes: [
      {
        id: "note-1",
        title: "Key concepts",
        content:
          "Brønsted-Lowry: acid donates H+, base accepts H+\npKa = -log(Ka), lower pKa = stronger acid\npH = -log[H+]\nBuffers resist pH changes\nConjugate acid-base pairs differ by one proton",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Apply Brønsted-Lowry acid-base definitions",
      },
      {
        id: "obj-2",
        text: "Calculate pH and pOH from Ka/Kb values",
      },
      {
        id: "obj-3",
        text: "Understand proton transfer in organic mechanisms",
      },
    ],
    summary:
      "Acid-base chemistry explains proton transfers in organic reactions. Mastering pKa and identifying acidic/basic sites is essential for predicting reaction outcomes.",
    tags: ["Acid-Base", "Equilibrium", "Mechanisms"],
    resources: [
      {
        title: "pKa Table - Common Compounds",
        type: "pdf",
        url: "#",
      },
      {
        title: "Henderson-Hasselbalch Calculator",
        type: "link",
        url: "/resources/calculator",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-org-3",
    aiPromptContext:
      "Student learning acid-base chemistry. Topics: pKa tables, proton transfer, nucleophilicity vs. basicity.",
    createdAt: "2024-02-01T12:00:00Z",
    updatedAt: "2024-02-01T12:00:00Z",
    relatedLessonIds: ["org-l1", "org-l2"],
    isCompleted: false,
    watchedDuration: 0,
  },

  // Physics Course - Quantum Physics (single example)
  "phys-l1": {
    id: "phys-l1",
    courseId: "4",
    moduleId: "phys-m1",
    title: "Introduction to Quantum Mechanics",
    description:
      "Explore the quantum world where the laws of classical mechanics break down. Learn about wave-particle duality, photons, the photoelectric effect, and why quantum mechanics is necessary to explain atomic phenomena.",
    videoUrl: "https://www.youtube.com/embed/T7-BXp7-S7c?si=NfzS_h7r6Bvp_Wej",
    thumbnailUrl: "⚛️",
    duration: 1320, // 22 minutes
    lessonOrder: 1,
    totalLessonsInModule: 5,
    instructor: "Dr. James Anderson",
    instructorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
    courseName: "Quantum Physics",
    moduleName: "Foundations of Quantum Mechanics",
    difficulty: "intermediate",
    estimatedCompletionTime: 35,
    notes: [
      {
        id: "note-1",
        title: "Key quantum concepts",
        content:
          "Photons: discrete energy packets. E = hf where h is Planck's constant\nWave-particle duality: light and matter exhibit both wave and particle properties\nQuantum leap: electrons transition between energy levels",
      },
    ],
    learningObjectives: [
      {
        id: "obj-1",
        text: "Understand why quantum mechanics is needed",
      },
      {
        id: "obj-2",
        text: "Explain wave-particle duality",
      },
      {
        id: "obj-3",
        text: "Apply photon energy concepts to problems",
      },
    ],
    summary:
      "Quantum mechanics describes the behavior of matter and energy at atomic and subatomic scales. This foundational lesson introduces key concepts that revolutionized physics.",
    tags: ["Quantum Mechanics", "Foundations", "Advanced"],
    resources: [
      {
        title: "Planck Equation Reference",
        type: "pdf",
        url: "#",
      },
      {
        title: "Wave-Particle Duality Simulations",
        type: "link",
        url: "/resources/quantum-sim",
      },
    ],
    quizAvailable: true,
    quizId: "quiz-phys-1",
    aiPromptContext:
      "Student exploring quantum mechanics. Topics: Planck constant, photon energy, electron transitions, uncertainty principle.",
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-03-01T10:00:00Z",
    relatedLessonIds: [],
    isCompleted: false,
    watchedDuration: 0,
  },
};

/**
 * Get all lessons for a specific course
 */
export function getLessonsForCourse(courseId: string): VideoLesson[] {
  return Object.values(lessonsMockById).filter((lesson) => lesson.courseId === courseId);
}

/**
 * Get related lessons for a specific lesson (same module and related lessons)
 */
export function getRelatedLessons(lessonId: string): VideoLesson[] {
  const lesson = lessonsMockById[lessonId];
  if (!lesson) return [];

  const sameModule = Object.values(lessonsMockById).filter(
    (l) => l.moduleId === lesson.moduleId && l.id !== lessonId
  );

  const relatedById = (lesson.relatedLessonIds || []).map((id) => lessonsMockById[id]).filter(Boolean);

  // Return same module first, then related, avoiding duplicates
  const seen = new Set([lessonId]);
  const result: VideoLesson[] = [];

  for (const l of sameModule) {
    if (!seen.has(l.id)) {
      result.push(l);
      seen.add(l.id);
    }
  }

  for (const l of relatedById) {
    if (!seen.has(l.id)) {
      result.push(l);
      seen.add(l.id);
    }
  }

  return result;
}
