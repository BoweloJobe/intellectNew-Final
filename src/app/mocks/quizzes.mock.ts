import type {
  GetQuizTemplateInput,
  QuizAttemptResult,
  QuizQuestionResult,
  QuizSubmissionInput,
  QuizTemplate,
  QuizzesPageData,
} from "../models/quizzes";

export const quizzesPageMock: QuizzesPageData = {
  upcomingQuizzes: [
    {
      subject: "Biology",
      topic: "Cell Structure & Function",
      date: "Tomorrow",
      time: "2:00 PM",
      duration: "45 min",
      questions: 25,
      difficulty: "Medium",
    },
    {
      subject: "Chemistry",
      topic: "Organic Compounds",
      date: "Mar 25",
      time: "10:00 AM",
      duration: "60 min",
      questions: 30,
      difficulty: "Hard",
    },
    {
      subject: "Physics",
      topic: "Quantum Mechanics Basics",
      date: "Mar 27",
      time: "3:00 PM",
      duration: "40 min",
      questions: 20,
      difficulty: "Easy",
    },
  ],
  pastQuizzes: [
    {
      subject: "Biology",
      topic: "DNA Replication",
      date: "Mar 20, 2026",
      score: 92,
      maxScore: 100,
      timeTaken: "38 min",
    },
    {
      subject: "Chemistry",
      topic: "Chemical Bonding",
      date: "Mar 18, 2026",
      score: 85,
      maxScore: 100,
      timeTaken: "42 min",
    },
    {
      subject: "Physics",
      topic: "Newton's Laws",
      date: "Mar 15, 2026",
      score: 78,
      maxScore: 100,
      timeTaken: "35 min",
    },
  ],
  practiceQuizzes: [],
};

// ─── Fallback template ────────────────────────────────────────────────────────
// Used by MockQuizzesAdapter when no instructor-authored quiz matches the input.

export function getQuizTemplateMock(input: GetQuizTemplateInput): QuizTemplate {
  return {
    id: input.quizId ?? "mock-fallback",
    subject: input.subject ?? "General",
    topic: input.topic ?? "Practice Quiz",
    difficulty: input.difficulty ?? "Medium",
    estimatedDurationMinutes: 10,
    questions: [
      {
        id: "mq-1",
        prompt: "Which sequence correctly describes the scientific method?",
        questionType: "MCQ",
        options: [
          { id: "a", text: "Observation → Hypothesis → Experiment → Conclusion" },
          { id: "b", text: "Hypothesis → Observation → Conclusion → Experiment" },
          { id: "c", text: "Experiment → Hypothesis → Observation → Conclusion" },
          { id: "d", text: "Conclusion → Observation → Experiment → Hypothesis" },
        ],
        correctOptionId: "a",
        explanation:
          "The scientific method starts with observation, forms a hypothesis, tests it through experiment, and draws a conclusion.",
      },
    ],
  };
}

// ─── Fallback submission result ───────────────────────────────────────────────
// Used by MockQuizzesAdapter for non-instructor quizzes that have no stored
// correct answers. Any selected answer is treated as correct in mock mode.

export function submitQuizAttemptMock(input: QuizSubmissionInput): QuizAttemptResult {
  const questionIds = Object.keys(input.answersByQuestionId);
  const total = Math.max(questionIds.length, 1);

  const questionResults: QuizQuestionResult[] = questionIds.map((questionId) => {
    const answer = input.answersByQuestionId[questionId];
    const selectedOptionId = answer?.questionType === "MCQ" ? answer.selectedOptionId : "";
    return {
      questionId,
      selectedOptionId: selectedOptionId ?? "",
      correctOptionId: selectedOptionId ?? "",
      isCorrect: Boolean(selectedOptionId),
      explanation: "",
    };
  });

  const score = questionResults.filter((r) => r.isCorrect).length;

  return {
    quizId: input.quizId,
    score,
    maxScore: total,
    percentage: Math.round((score / total) * 100),
    elapsedSeconds: Math.max(0, Math.floor(input.elapsedSeconds)),
    questionResults,
  };
}

// ─── Seeded quiz templates ────────────────────────────────────────────────────
// These back the three practice cards pre-populated in quizzesPageMock.
// IDs must match the quizId values in the practiceQuizzes array above.

export const SEEDED_QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    id: "seed-biology-genetics",
    subject: "Biology",
    topic: "Genetics Practice",
    difficulty: "Medium",
    estimatedDurationMinutes: 8,
    passingScore: 70,
    questions: [
      {
        id: "bg-q1",
        prompt: "Which molecule carries the genetic information of most living organisms?",
        questionType: "MCQ",
        options: [
          { id: "bg-q1-a", text: "DNA" },
          { id: "bg-q1-b", text: "RNA" },
          { id: "bg-q1-c", text: "Protein" },
          { id: "bg-q1-d", text: "Glucose" },
        ],
        correctOptionId: "bg-q1-a",
        explanation: "DNA (deoxyribonucleic acid) encodes the genetic instructions used in the growth, development, and function of all known organisms.",
      },
      {
        id: "bg-q2",
        prompt: "Which scientists are credited with discovering the double helix structure of DNA?",
        questionType: "MCQ",
        options: [
          { id: "bg-q2-a", text: "Louis Pasteur and Robert Koch" },
          { id: "bg-q2-b", text: "Charles Darwin and Alfred Wallace" },
          { id: "bg-q2-c", text: "James Watson and Francis Crick" },
          { id: "bg-q2-d", text: "Gregor Mendel and Thomas Hunt Morgan" },
        ],
        correctOptionId: "bg-q2-c",
        explanation: "Watson and Crick published the double helix model in 1953, building on X-ray crystallography data from Rosalind Franklin and Maurice Wilkins.",
      },
      {
        id: "bg-q3",
        prompt: "What is the basic unit of heredity?",
        questionType: "MCQ",
        options: [
          { id: "bg-q3-a", text: "Chromosome" },
          { id: "bg-q3-b", text: "Nucleotide" },
          { id: "bg-q3-c", text: "Gene" },
          { id: "bg-q3-d", text: "Ribosome" },
        ],
        correctOptionId: "bg-q3-c",
        explanation: "A gene is a segment of DNA that encodes a functional product (typically a protein) and is the fundamental unit of heredity.",
      },
      {
        id: "bg-q4",
        prompt: "During which phase of meiosis does chromosomal crossing over occur?",
        questionType: "MCQ",
        options: [
          { id: "bg-q4-a", text: "Metaphase I" },
          { id: "bg-q4-b", text: "Anaphase II" },
          { id: "bg-q4-c", text: "Prophase I" },
          { id: "bg-q4-d", text: "Telophase I" },
        ],
        correctOptionId: "bg-q4-c",
        explanation: "Crossing over (recombination) occurs during Prophase I when homologous chromosomes pair and exchange segments, increasing genetic diversity.",
      },
      {
        id: "bg-q5",
        prompt: "A parent organism has genotype Aa. What fraction of its offspring will be homozygous dominant (AA)?",
        questionType: "MCQ",
        options: [
          { id: "bg-q5-a", text: "1/4" },
          { id: "bg-q5-b", text: "1/2" },
          { id: "bg-q5-c", text: "3/4" },
          { id: "bg-q5-d", text: "None — Aa cannot produce AA" },
        ],
        correctOptionId: "bg-q5-a",
        explanation: "Crossing Aa × Aa gives a 1:2:1 ratio (AA : Aa : aa), so 1/4 of offspring are homozygous dominant (AA).",
      },
    ],
  },
  {
    id: "seed-chemistry-reactions",
    subject: "Chemistry",
    topic: "Reactions & Equations",
    difficulty: "Easy",
    estimatedDurationMinutes: 8,
    passingScore: 60,
    questions: [
      {
        id: "cr-q1",
        prompt: "Which law states that matter cannot be created or destroyed in a chemical reaction?",
        questionType: "MCQ",
        options: [
          { id: "cr-q1-a", text: "Law of Definite Proportions" },
          { id: "cr-q1-b", text: "Law of Conservation of Mass" },
          { id: "cr-q1-c", text: "Law of Multiple Proportions" },
          { id: "cr-q1-d", text: "Boyle's Law" },
        ],
        correctOptionId: "cr-q1-b",
        explanation: "The Law of Conservation of Mass (Lavoisier, 1789) states that total mass of reactants equals total mass of products in any chemical reaction.",
      },
      {
        id: "cr-q2",
        prompt: "In the balanced equation 2H₂ + O₂ → 2H₂O, how many moles of water are produced from 1 mole of O₂?",
        questionType: "MCQ",
        options: [
          { id: "cr-q2-a", text: "1" },
          { id: "cr-q2-b", text: "2" },
          { id: "cr-q2-c", text: "3" },
          { id: "cr-q2-d", text: "4" },
        ],
        correctOptionId: "cr-q2-b",
        explanation: "The stoichiometry shows a 1:2 molar ratio between O₂ and H₂O, so 1 mole of O₂ produces 2 moles of water.",
      },
      {
        id: "cr-q3",
        prompt: "Which type of reaction releases energy to the surroundings as heat?",
        questionType: "MCQ",
        options: [
          { id: "cr-q3-a", text: "Endothermic" },
          { id: "cr-q3-b", text: "Photolytic" },
          { id: "cr-q3-c", text: "Exothermic" },
          { id: "cr-q3-d", text: "Reversible" },
        ],
        correctOptionId: "cr-q3-c",
        explanation: "Exothermic reactions release energy (usually as heat) to the surroundings; the products have lower enthalpy than the reactants.",
      },
      {
        id: "cr-q4",
        prompt: "Which of the following is an example of a decomposition reaction?",
        questionType: "MCQ",
        options: [
          { id: "cr-q4-a", text: "2H₂ + O₂ → 2H₂O" },
          { id: "cr-q4-b", text: "NaCl + AgNO₃ → NaNO₃ + AgCl" },
          { id: "cr-q4-c", text: "CaCO₃ → CaO + CO₂" },
          { id: "cr-q4-d", text: "CH₄ + 2O₂ → CO₂ + 2H₂O" },
        ],
        correctOptionId: "cr-q4-c",
        explanation: "Decomposition reactions break a single compound into two or more simpler substances. CaCO₃ → CaO + CO₂ is a classic thermal decomposition.",
      },
      {
        id: "cr-q5",
        prompt: "What role does a catalyst play in a chemical reaction?",
        questionType: "MCQ",
        options: [
          { id: "cr-q5-a", text: "Raises the activation energy" },
          { id: "cr-q5-b", text: "Lowers the activation energy without being consumed" },
          { id: "cr-q5-c", text: "Changes the products formed" },
          { id: "cr-q5-d", text: "Is permanently consumed in the reaction" },
        ],
        correctOptionId: "cr-q5-b",
        explanation: "A catalyst provides an alternative reaction pathway with lower activation energy, increasing reaction rate without being consumed in the process.",
      },
    ],
  },
  {
    id: "seed-biology-cell-division",
    subject: "Biology",
    topic: "Cell Division",
    difficulty: "Hard",
    estimatedDurationMinutes: 8,
    passingScore: 75,
    questions: [
      {
        id: "cd-q1",
        prompt: "What is the primary purpose of mitosis in multicellular organisms?",
        questionType: "MCQ",
        options: [
          { id: "cd-q1-a", text: "Production of haploid gametes" },
          { id: "cd-q1-b", text: "Growth, development, and repair of cells" },
          { id: "cd-q1-c", text: "Introduction of genetic variation" },
          { id: "cd-q1-d", text: "Formation of reproductive spores" },
        ],
        correctOptionId: "cd-q1-b",
        explanation: "Mitosis produces two genetically identical diploid daughter cells, enabling growth, tissue repair, and asexual reproduction in multicellular organisms.",
      },
      {
        id: "cd-q2",
        prompt: "How many chromosomes are found in a typical human somatic (body) cell?",
        questionType: "MCQ",
        options: [
          { id: "cd-q2-a", text: "23" },
          { id: "cd-q2-b", text: "46" },
          { id: "cd-q2-c", text: "92" },
          { id: "cd-q2-d", text: "48" },
        ],
        correctOptionId: "cd-q2-b",
        explanation: "Human somatic cells are diploid (2n = 46), containing 23 pairs of chromosomes. Gametes are haploid with only 23 chromosomes.",
      },
      {
        id: "cd-q3",
        prompt: "During which phase of mitosis do chromosomes align along the cell's equatorial plane?",
        questionType: "MCQ",
        options: [
          { id: "cd-q3-a", text: "Prophase" },
          { id: "cd-q3-b", text: "Anaphase" },
          { id: "cd-q3-c", text: "Telophase" },
          { id: "cd-q3-d", text: "Metaphase" },
        ],
        correctOptionId: "cd-q3-d",
        explanation: "During Metaphase, chromosomes are maximally condensed and align at the metaphase plate (cell equator), ensuring equal segregation to daughter cells.",
      },
      {
        id: "cd-q4",
        prompt: "What is cytokinesis?",
        questionType: "MCQ",
        options: [
          { id: "cd-q4-a", text: "DNA replication in S phase" },
          { id: "cd-q4-b", text: "Division of the nucleus" },
          { id: "cd-q4-c", text: "Division of the cytoplasm to produce two daughter cells" },
          { id: "cd-q4-d", text: "Condensation of chromosomes in prophase" },
        ],
        correctOptionId: "cd-q4-c",
        explanation: "Cytokinesis is the physical division of the cytoplasm following nuclear division (karyokinesis), yielding two complete daughter cells.",
      },
      {
        id: "cd-q5",
        prompt: "Which structure is primarily responsible for pulling chromosomes toward opposite poles during anaphase?",
        questionType: "MCQ",
        options: [
          { id: "cd-q5-a", text: "Centrosome" },
          { id: "cd-q5-b", text: "Cell membrane" },
          { id: "cd-q5-c", text: "Endoplasmic reticulum" },
          { id: "cd-q5-d", text: "Spindle fibers (kinetochore microtubules)" },
        ],
        correctOptionId: "cd-q5-d",
        explanation: "Kinetochore microtubules (spindle fibers) attach to the kinetochores of chromosomes and shorten to pull sister chromatids toward opposite poles.",
      },
    ],
  },
];
