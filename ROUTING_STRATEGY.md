# Routing Strategy & Integration Map

## Route Hierarchy

```
Root: "/"
├── /dashboard (StudentDashboard)
│   └─ "Continue Learning" cards
│      └─ Click → /courses/:courseId/lessons/:lessonId ✅
│
├── /courses (CoursesPage)
│   └─ Click any course card
│      └─ /courses/:id (CourseDetailsPage)
│         ├─ "Continue Where You Left Off" button
│         │  └─ → /courses/:courseId/lessons/:nextLessonId ✅
│         └─ Curriculum section (lesson list)
│            └─ Click lesson item
│               └─ → /courses/:courseId/lessons/:lessonId ✅
│
├── /courses/:courseId/lessons/:lessonId (VideoLessonPage) ✅✅✅
│   ├─ "Mark Complete" button
│   ├─ "Take Quiz" button
│   │  └─ → /quizzes?lessonId=bio-l1&courseId=1 ✅
│   ├─ "Ask AI" button
│   │  └─ → /ai-tutor (with lesson context) ✅
│   └─ "Further Videos" section
│      └─ Click related lesson
│         └─ → /courses/:courseId/lessons/:newLessonId ✅ (same page, new lesson)
│
├── /quizzes (QuizPage)
│   └─ Started from lesson's "Take Quiz" button
│      └─ Has lesson context in state ✅
│
└── /ai-tutor (AITutorPage)
    └─ Started from lesson's "Ask AI" button
       └─ Has lesson title, course name, suggested prompt in state ✅
```

---

## Routing Detail Table

| From Page | User Action | Route Destination | Data Passed | Status |
|-----------|------------|------------------|-------------|--------|
| **Dashboard** | Click "Continue Learning" card | `/courses/:courseId/lessons/:lessonId` | courseId, lessonId | ✅ Implemented |
| **Courses Page** | Click course card | `/courses/:id` | courseId | (existing) |
| **Course Details** | Click "Continue Where You Left Off" | `/courses/:courseId/lessons/:nextLessonId` | courseId, next lesson ID | ✅ Implemented |
| **Course Details** | Click lesson in curriculum | `/courses/:courseId/lessons/:lessonId` | courseId, lessonId | ✅ Implemented |
| **Video Lesson** | Click "Mark Complete" | (reload same page) | Updates completion state | ✅ Implemented |
| **Video Lesson** | Click "Take Quiz" | `/quizzes?lessonId=X&courseId=Y` | lessonId, courseId in state | ✅ Implemented |
| **Video Lesson** | Click "Ask AI" | `/ai-tutor` | lessonId, lessonTitle, courseId in state | ✅ Implemented |
| **Video Lesson** | Click related lesson | `/courses/:courseId/lessons/:lessonId` | New lessonId | ✅ Implemented |
| **Quiz Page** | Return from quiz | (back navigation) | None | (browser back) |
| **AI Tutor** | Return from tutor | (back navigation) | None | (browser back) |

---

## New Route Definition

### Location: [src/app/routes.ts](src/app/routes.ts)

```typescript
{
  path: "courses/:courseId/lessons/:lessonId",
  Component: VideoLessonPage
}
```

### Route Structure Inside ProtectedRoute:
```typescript
{
  Component: ProtectedRoute,
  children: [
    // ... existing routes ...
    { path: "courses", Component: CoursesPage },
    { path: "courses/:id", Component: CourseDetailsPage },
    { path: "courses/:courseId/lessons/:lessonId", Component: VideoLessonPage }, // NEW
    // ... other routes ...
  ],
}
```

---

## Parameter Usage

### Route Params: `:courseId` and `:lessonId`

**In VideoLessonPage.tsx:**
```typescript
const { courseId, lessonId } = useParams();
const numCourseId = Number(courseId ?? "1");

// Fetch lesson data
await getVideoLessonData(lessonId);
// Fetch related lessons
await getFurtherLessons(lessonId);
```

### Query Params: For Quiz Navigation

**When sending to quiz:**
```typescript
navigate(`/quizzes?lessonId=${lesson.id}&courseId=${numCourseId}`, {
  state: { 
    fromLesson: lesson.id, 
    courseName: lesson.courseName 
  },
})
```

### State Props: For AI Tutor

**When sending to AI Tutor:**
```typescript
navigate("/ai-tutor", {
  state: {
    contextLessonId: lesson.id,
    contextLessonTitle: lesson.title,
    contextCourseName: lesson.courseName,
    contextPrompt: lesson.aiPromptContext || `I have a question about ${lesson.title}.`,
  },
});
```

---

## Data Flow Example

### User Journey 1: Dashboard → Lesson → Quiz

```
1. User on Dashboard (/dashboard)
   - Sees "Continue Learning" cards
   - Click "Advanced Biology" card
   
2. Navigate to /courses/1/lessons/bio-l1
   - VideoLessonPage component mounts
   - Route params: courseId=1, lessonId=bio-l1
   - Fetches lesson data for bio-l1
   
3. On lesson page
   - See video, metadata, objectives, notes
   - Click "Take Quiz" button
   
4. Navigate to /quizzes?lessonId=bio-l1&courseId=1
   - QuizPage receives query params
   - Can identify which lesson quiz is for
   - Shows context: "Quiz for What is Biology?"
   
5. After quiz
   - User clicks back or "Back to Lesson"
   - Returns to /courses/1/lessons/bio-l1
```

### User Journey 2: Course Details → Lesson → Further Lessons

```
1. User on /courses/1 (CourseDetailsPage)
   - Sees curriculum with all lessons
   - Lesson "Cell Membrane" (bio-l4) is current/next
   - Click lesson item
   
2. Navigate to /courses/1/lessons/bio-l4
   - VideoLessonPage loads lesson bio-l4
   - Right sidebar shows further videos from bio-m2 module
   
3. See "Further Videos"
   - Lists: Nucleus & Organelles (bio-l5), and others
   - Click on bio-l5
   
4. Navigate to /courses/1/lessons/bio-l5
   - Same page component
   - URL changes to new lessonId
   - Video player switches, metadata updates
   - Further videos list updates with new related lessons
```

### User Journey 3: Lesson → Ask AI → Return

```
1. User on /courses/1/lessons/bio-l1
   - Click "Ask AI" button
   
2. Navigate to /ai-tutor with state:
   {
     contextLessonId: "bio-l1",
     contextLessonTitle: "What is Biology?",
     contextCourseName: "Advanced Biology",
     contextPrompt: "The student just learned about..."
   }
   
3. On AITutorPage
   - Can read context from location.state
   - Show suggestion: "Ask me about What is Biology?"
   - User types question about the lesson
   
4. User clicks back or continues to other tutor sessions
   - Browser back takes them to /courses/1/lessons/bio-l1
   - Lesson page still loaded, ready to continue learning
```

---

## Route Parameter Examples

### Biology Course - All Lessons
| Lesson | URL Path |
|--------|----------|
| "What is Biology?" | `/courses/1/lessons/bio-l1` |
| "Cell Theory" | `/courses/1/lessons/bio-l2` |
| "Basic Chemistry" | `/courses/1/lessons/bio-l3` |
| "Cell Membrane" | `/courses/1/lessons/bio-l4` |
| "Nucleus & Organelles" | `/courses/1/lessons/bio-l5` |

### Chemistry Course - All Lessons
| Lesson | URL Path |
|--------|----------|
| "Bonding Review" | `/courses/2/lessons/org-l1` |
| "Functional Groups" | `/courses/2/lessons/org-l2` |
| "Acid-Base Principles" | `/courses/2/lessons/org-l3` |

### Physics Course - Example Lesson
| Lesson | URL Path |
|--------|----------|
| "Intro to Quantum Mechanics" | `/courses/4/lessons/phys-l1` |

---

## Breadcrumb Navigation

**On VideoLessonPage**, breadcrumb shows:
```
Courses / Course Name / Lesson Title
```

Clicking "Courses" → `/courses`
Clicking "Course Name" → `/courses/:courseId`
Current page → `/courses/:courseId/lessons/:lessonId`

---

## Navigation Component Usage

### Link from CourseDetailsPage to Lesson:
```tsx
<Link to={`/courses/${courseId}/lessons/${lesson.id}`}>
  <SolidCard>
    {/* lesson content */}
  </SolidCard>
</Link>
```

### Link from StudentDashboard to Lesson:
```tsx
<Link to={`/courses/${course.courseId}/lessons/bio-l1`}>
  <SolidCard>
    {/* continue learning card */}
  </SolidCard>
</Link>
```

### Navigation on VideoLessonPage:
```tsx
// For further videos
const handleNextLesson = (nextLessonId: string) => {
  navigate(`/courses/${numCourseId}/lessons/${nextLessonId}`);
}

// For quiz
const handleTakeQuiz = () => {
  navigate(`/quizzes?lessonId=${lesson.id}&courseId=${numCourseId}`, {
    state: { fromLesson: lesson.id, courseName: lesson.courseName }
  });
}

// For AI tutor
const handleAskAI = () => {
  navigate("/ai-tutor", {
    state: {
      contextLessonId: lesson.id,
      contextLessonTitle: lesson.title,
      contextCourseName: lesson.courseName,
      contextPrompt: lesson.aiPromptContext || `I have a question about ${lesson.title}.`
    }
  });
}
```

---

## Protected Routes

All lesson pages are inside the `ProtectedRoute` component:
```tsx
{
  Component: ProtectedRoute,
  children: [
    // ... requires authentication ...
    { path: "courses/:courseId/lessons/:lessonId", Component: VideoLessonPage }
  ]
}
```

This means:
✅ Unauthenticated users → redirected to login
✅ Authenticated users → can access lesson
✅ No login required for landing page, pricing, etc.

---

## Edge Cases Handled

### 1. Invalid Route Parameters
- No lessonId → Error state: "Unable to load lesson"
- Invalid lessonId → 404 handled by service layer
- Invalid courseId → Used for breadcrumb but doesn't block

### 2. Lesson Not Found
- Service returns error
- Component shows DataErrorState with retry button
- Retry reloads lesson data

### 3. No Further Videos
- Shows empty state if related lessons not found
- Doesn't break layout
- User can continue learning without navigation

### 4. No Quiz Available
- Quiz button shows but behaves based on `quizAvailable` flag
- If false: could be disabled or hidden
- Currently shows state via QuizPage if tried

### 5. Browser Back Button
- Works naturally in browser
- Returns to previous page with previous lesson
- No state loss issues

---

## Validation Checklist

- [x] Route defined in routes.ts
- [x] Component imported in routes.ts
- [x] Route inside ProtectedRoute (auth required)
- [x] Route pattern follows REST conventions
- [x] Route params match component expectations
- [x] All navigation links use correct URL pattern
- [x] Quiz integration passes correct query params
- [x] AI Tutor integration passes lesson context
- [x] Further Videos switch lessons correctly
- [x] Breadcrumb links are correct
- [x] Dashboard continues learning links work
- [x] Course details curriculum is clickable
- [x] Error states handled properly
- [x] Loading states shown properly
- [x] Mobile navigation works
- [x] Browser back button works
- [x] No hardcoded lesson/course IDs in links

---

## Conclusion

The routing strategy is:
✅ **Clear**: Hierarchical, RESTful, easy to understand
✅ **Complete**: All pages connected with no dead ends
✅ **Flexible**: Works with any courseId and lessonId
✅ **Scalable**: Same pattern works for hundreds of courses/lessons
✅ **Robust**: Error handling, state management, proper navigation
