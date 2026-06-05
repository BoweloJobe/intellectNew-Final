# System Architecture Diagram & Flow Chart

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VideoLessonPage Component                 │
│  Location: src/app/pages/VideoLessonPage.tsx                │
│  Route: /courses/:courseId/lessons/:lessonId                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ Renders
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │ Video Player │    │   Metadata   │    │   Tabs      │
  │  (YouTube    │    │   Section    │    │  (Info/    │
  │   iframe)    │    │  (Duration,  │    │  Notes)    │
  │              │    │  Difficulty) │    │            │
  └──────────────┘    └──────────────┘    └──────────────┘
        │                     │                     │
        │                     │                     │
        ├─ Breadcrumb Navigation                   │
        │  Courses > Course Name > Lesson Title     │
        │                                           │
        ├─ Action Buttons                          │
        │  • Mark Complete                         │
        │  • Take Quiz → /quizzes                 │
        │  • Ask AI → /ai-tutor                   │
        │                                           │
        └─ Further Videos Sidebar                  │
           Click Related → /courses/:courseId/lessons/:newLessonId
```

---

## Data Flow Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Route Parameters                        │
│              /courses/:courseId/lessons/:lessonId           │
│                                                               │
│  Example: /courses/1/lessons/bio-l1                         │
│           courseId=1, lessonId="bio-l1"                     │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                  VideoLessonPage Component                    │
│  • useParams() extracts courseId and lessonId                │
│  • Calls service functions with params                       │
└──────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  getVideo    │    │  getFurther  │    │  useProduct  │
│  LessonData  │    │    Lessons   │    │  State       │
│   (lessonId) │    │   (lessonId) │    │ (completion) │
└──────────────┘    └──────────────┘    └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────────────────────────────────────────────────────┐
│            Fetch from Mock Data or API                       │
│  • lessonsMockById[lessonId] → VideoLesson object           │
│  • getRelatedLessons(lessonId) → VideoLesson[]              │
│  • courseLessonProgress → completion state                  │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                    Component State Update                     │
│  • setState(lesson) - Single lesson object                  │
│  • setRelatedLessons(lessons) - Array of related            │
│  • setViewState('success')                                   │
└──────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                        Render UI                             │
│  ✓ Video Player with lesson.videoUrl                        │
│  ✓ Metadata from lesson.* fields                            │
│  ✓ Objectives from lesson.learningObjectives                │
│  ✓ Notes from lesson.notes                                  │
│  ✓ Further Videos from relatedLessons array                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration Flow Map

```
                          START: User Interaction
                                  │
                    ┌─────────────┬─────────────┐
                    │             │             │
                    ▼             ▼             ▼
              ┌──────────────┬──────────────┬──────────────┐
              │  Dashboard   │  Courses     │ Course       │
              │              │  Page        │ Details      │
              │ (/dashboard) │ (/courses)   │ (/courses/1) │
              └──────────────┬──────────────┬──────────────┘
                    │             │             │
             Click "Continue" Click Course Click Lesson
                    │             │             │
                    └─────────────┴─────────────┘
                            │
                            ▼
            ┌──────────────────────────────────┐
            │    Navigate to New Route          │
            │  /courses/:courseId/lessons:     │
            │         :lessonId                │
            │                                  │
            │  Example:                        │
            │  /courses/1/lessons/bio-l1      │
            └──────────────────────────────────┘
                            │
                            ▼
            ┌──────────────────────────────────┐
            │  VideoLessonPage Loads           │
            │  • Fetches lesson data           │
            │  • Fetches related lessons       │
            │  • Renders UI                    │
            └──────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ User Clicks  │ │ User Clicks  │ │ User Clicks  │
    │ "Take Quiz"  │ │ "Ask AI"     │ │ Related      │
    │              │ │              │ │ Lesson       │
    └──────────────┘ └──────────────┘ └──────────────┘
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Route to   │ │   Route to   │ │   Load New   │
    │  /quizzes    │ │ /ai-tutor    │ │   Lesson in  │
    │              │ │              │ │   Same Page  │
    │ (with        │ │ (with lesson │ │              │
    │  context)    │ │  context)    │ │  (update     │
    └──────────────┘ └──────────────┘ │   route)     │
            │               │          └──────────────┘
            │               │               │
            ▼               ▼               ▼
    QuizPage loads  AITutorPage loads    VideoLessonPage
    with lesson      with lesson         shows new lesson
    context          context             in sidebar
                                                │
                                    ┌───────────┘
                                    │
                                    ▼
                        Browser Back Returns to
                        Previous Lesson/Page
```

---

## State Management Flow

```
VideoLessonPage Component
│
├─ useParams()
│  ├─ courseId (string/undefined)
│  └─ lessonId (string/undefined)
│
├─ useState(viewState)
│  ├─ "loading" → Show skeletons
│  ├─ "success" → Show full content
│  └─ "error" → Show error message + retry
│
├─ useState(lesson)
│  └─ VideoLesson | null
│     └─ Contains all lesson data:
│        ├─ id, courseId, title, description
│        ├─ videoUrl, duration, difficulty
│        ├─ instructor, instructorAvatar
│        ├─ courseName, moduleName
│        ├─ learningObjectives[]
│        ├─ notes[]
│        ├─ resources[]
│        ├─ quizAvailable, quizId
│        ├─ aiPromptContext
│        ├─ tags[]
│        ├─ relatedLessonIds[]
│        └─ isCompleted, watchedDuration
│
├─ useState(relatedLessons)
│  └─ VideoLesson[]
│     └─ Lessons from same module + related
│
├─ useEffect (on lessonId change)
│  ├─ Check lessonId exists
│  ├─ Call getVideoLessonData(lessonId)
│  ├─ Call getFurtherLessons(lessonId)
│  ├─ Update state
│  └─ Handle errors
│
├─ useProductState()
│  ├─ completeLesson() function
│  └─ For marking lessons complete
│
└─ Event Handlers
   ├─ handleMarkComplete()
   │  └─ Call completeLesson(), reload
   ├─ handleTakeQuiz()
   │  └─ navigate() to /quizzes with context
   ├─ handleAskAI()
   │  └─ navigate() to /ai-tutor with context
   └─ handleNextLesson()
      └─ navigate() to new lesson ID
```

---

## Data Model Relationship

```
VideoLesson (Primary Entity)
│
├─ Core Identifiers
│  ├─ id: "bio-l1"
│  ├─ courseId: 1
│  └─ moduleId: "bio-m1"
│
├─ Content
│  ├─ title: "What is Biology?"
│  ├─ description: "An introduction to..."
│  ├─ summary: "This foundational lesson..."
│  ├─ videoUrl: "https://youtube.com/embed/..."
│  ├─ duration: 720 (seconds)
│  └─ thumbnailUrl: "🧬"
│
├─ Teaching & Learning
│  ├─ learningObjectives[]
│  │  └─ LessonObjective
│  │     ├─ id, text
│  │     └─ completed?
│  │
│  ├─ notes[]
│  │  └─ VideoLessonNote
│  │     ├─ id, title, content
│  │     └─ timestamp? (optional)
│  │
│  └─ resources[]
│     └─ VideoLessonResource
│        ├─ title, type (pdf/link/doc)
│        └─ url
│
├─ Metadata
│  ├─ instructor: "Dr. Sarah Williams"
│  ├─ instructorAvatar: "https://..."
│  ├─ courseName: "Advanced Biology"
│  ├─ moduleName: "Introduction to Biology"
│  ├─ lessonOrder: 1
│  ├─ totalLessonsInModule: 3
│  ├─ difficulty: "beginner" | "intermediate" | "advanced"
│  ├─ estimatedCompletionTime: 20 (minutes)
│  ├─ tags: ["Introduction", "Fundamentals"]
│  ├─ createdAt: ISO string
│  └─ updatedAt: ISO string
│
├─ Assessment
│  ├─ quizAvailable: boolean
│  └─ quizId? (if quiz available)
│
├─ AI Integration
│  └─ aiPromptContext: "The student just learned..."
│
├─ Navigation
│  └─ relatedLessonIds: ["bio-l2", "bio-l3"]
│
└─ Progress Tracking
   ├─ isCompleted? (optional)
   └─ watchedDuration? (optional)
```

---

## Service Layer Architecture

```
Service Layer: lessons.service.ts
│
├─ getVideoLessonData(lessonId: string)
│  ├─ Input: lessonId (from route param)
│  ├─ Logic: lookuplessonsMockById[lessonId]
│  ├─ Delay: withMockDelay(lesson)
│  └─ Output: Promise<VideoLesson>
│
├─ getFurtherLessons(lessonId: string)
│  ├─ Input: lessonId
│  ├─ Logic: getRelatedLessons(lessonId) from mock
│  ├─ Delay: withMockDelay(lessons)
│  └─ Output: Promise<VideoLesson[]>
│
├─ getCourseLessons(courseId: number)
│  ├─ Input: courseId
│  ├─ Logic: getLessonsForCourse(courseId) from mock
│  ├─ Delay: withMockDelay(lessons)
│  └─ Output: Promise<VideoLesson[]>
│
├─ getLessonNotes(lessonId: string)
│  ├─ Input: lessonId
│  ├─ Logic: Extract notes from lesson object
│  ├─ Delay: withMockDelay(notes)
│  └─ Output: Promise<VideoLessonNote[]>
│
├─ completeLessonVideo()
│  ├─ Input: (none - uses component state)
│  ├─ Logic: Simulate completion, potential failure
│  ├─ Delay: withMockDelay(null, 200)
│  └─ Output: Promise<void>
│
├─ trackLessonProgress()
│  ├─ Input: (none)
│  ├─ Logic: Simulate tracking
│  ├─ Delay: withMockDelay(null, 100)
│  └─ Output: Promise<void>
│
└─ getCourseWithLessons(courseId: number)
   ├─ Input: courseId
   ├─ Logic: Parallel fetch getCourseDetails + getCourseLessons
   ├─ Delay: Parallel promises
   └─ Output: Promise<{courseDetails, lessons}>

All functions can be swapped with real API calls
without changing component code.
```

---

## Navigation Tree

```
root (/)
├── public pages
│   ├── "/" (LandingPage)
│   ├── "/login"
│   ├── "/signup"
│   ├── "/pricing"
│   └── "/unauthorized"
│
└── protected routes (ProtectedRoute)
    ├── "/dashboard"
    │   └─ Links to: /courses/:courseId/lessons/:lessonId
    │
    ├── "/courses"
    │   └─ Links to: /courses/:id
    │
    ├── "/courses/:id" (CourseDetailsPage)
    │   └─ Links to: /courses/:courseId/lessons/:lessonId ✨NEW
    │
    ├── "/courses/:courseId/lessons/:lessonId" ✨NEW
    │   ├─ Component: VideoLessonPage
    │   ├─ Links to: /quizzes (from Take Quiz button)
    │   ├─ Links to: /ai-tutor (from Ask AI button)
    │   └─ Links to: /courses/:courseId/lessons/:newLessonId (further videos)
    │
    ├── "/quizzes" (QuizPage)
    │   └─ Can receive context from /courses/.../lessons route
    │
    ├── "/progress"
    ├── "/ai-tutor"
    │   └─ Can receive context from /courses/.../lessons route
    ├── "/community"
    ├── "/notes"
    ├── "/settings"
    │
    └── instructor/admin protected
        ├── "/instructor"
        └── "/admin"
```

---

## Error Handling Flow

```
VideoLessonPage
│
├─ Validate Route Params
│  ├─ lessonId missing?
│  │  └─ setViewState('error')
│  └─ lessonId exists?
│     └─ Continue to fetch
│
├─ Try to Fetch Data
│  ├─ Promise.all([
│  │    getVideoLessonData(lessonId),
│  │    getFurtherLessons(lessonId)
│  │  ])
│  │
│  ├─ On Success (catch block false)
│  │  ├─ setLesson(data)
│  │  ├─ setRelatedLessons(data)
│  │  └─ setViewState('success')
│  │
│  └─ On Error (catch block true)
│     ├─ Log error
│     └─ setViewState('error')
│
├─ Render Based on viewState
│  ├─ viewState === 'loading'
│  │  └─ Show skeleton loaders
│  │
│  ├─ viewState === 'error'
│  │  ├─ Show DataErrorState component
│  │  ├─ "Course details are unavailable..."
│  │  └─ Retry button calls window.location.reload()
│  │
│  └─ viewState === 'success'
│     └─ Show full VideoLessonPage UI
│
└─ Always Handle Edge Cases
   ├─ lesson === null?
   │  └─ Show error (shouldn't happen with success state)
   ├─ relatedLessons.length === 0?
   │  └─ Show empty state message
   └─ quizAvailable === false?
      └─ Quiz button still renders but might be disabled
```

---

## Build & Deployment Status

```
npm run build
│
├─ Vite Configuration Processing
│  └─ vite.config.ts
│
├─ TypeScript Compilation
│  ├─ src/app/models/lessons.ts ✅
│  ├─ src/app/mocks/lessons.mock.ts ✅
│  ├─ src/app/services/lessons.service.ts ✅
│  ├─ src/app/pages/VideoLessonPage.tsx ✅
│  ├─ src/app/routes.ts ✅
│  ├─ src/app/pages/CourseDetailsPage.tsx ✅
│  └─ src/app/pages/StudentDashboard.tsx ✅
│     └─ 2357 modules transformed ✅
│
├─ Release Build
│  ├─ dist/index.html (0.44 kB gzip)
│  ├─ dist/assets/index...css (122.49 kB gzip: 19.09 kB)
│  └─ dist/assets/index...js (1000.83 kB gzip: 285.06 kB)
│
└─ Build Result: ✅ SUCCESS in 11.48 seconds
   └─ Ready for deployment
```

---

## Conclusion

This architecture provides:
✅ **Clear Data Flow** - Props → Service → Component → UI
✅ **Proper Separation of Concerns** - Services, Components, Models
✅ **Reusability** - Works with any course/lesson via route params
✅ **Maintainability** - Typed, documented, organized
✅ **Extensibility** - Easy to add features without breaking code
✅ **Testability** - Each layer can be tested independently
✅ **Performance** - Parallel data fetching, no unnecessary renders
✅ **Error Resilience** - Proper error handling and retry mechanisms
