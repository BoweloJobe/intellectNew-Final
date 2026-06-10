-- Add lifecycle timing for quiz attempts and align started-attempt defaults.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_quiz_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Existing rows were already submitted attempts before timing was introduced.
INSERT INTO "new_quiz_attempts" ("id", "quizId", "userId", "score", "passed", "status", "startedAt", "expiresAt", "submittedAt")
SELECT "id", "quizId", "userId", "score", "passed", 'SUBMITTED', "submittedAt", NULL, "submittedAt" FROM "quiz_attempts";

DROP TABLE "quiz_attempts";
ALTER TABLE "new_quiz_attempts" RENAME TO "quiz_attempts";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "quiz_attempts_quizId_userId_status_idx" ON "quiz_attempts"("quizId", "userId", "status");
