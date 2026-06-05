export interface VideoLessonResource {
  title: string;
  type: "pdf" | "link" | "document";
  url: string;
  icon?: string;
}

export interface VideoLessonNote {
  id: string;
  timestamp?: number;
  title: string;
  content: string;
}

export interface LessonObjective {
  id: string;
  text: string;
  completed?: boolean;
}

export interface VideoLesson {
  // Core identifiers
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  
  // Video metadata
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number; // in seconds
  
  // Lesson hierarchy
  lessonOrder: number;
  totalLessonsInModule: number;
  
  // Instructor & course info
  instructor: string;
  instructorAvatar: string;
  courseName: string;
  moduleName: string;
  
  // Difficulty & completion
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedCompletionTime: number; // in minutes
  
  // Content
  notes: VideoLessonNote[];
  learningObjectives: LessonObjective[];
  summary: string;
  tags: string[];
  
  // Resources & assessment
  resources: VideoLessonResource[];
  quizAvailable: boolean;
  quizId?: string;
  isFreePreview?: boolean;
  
  // AI integration
  aiPromptContext?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  relatedLessonIds?: string[];
  
  // Progress tracking
  isCompleted?: boolean;
  watchedDuration?: number; // in seconds
}

export interface LessonWithModule extends VideoLesson {
  moduleTitle: string;
}
