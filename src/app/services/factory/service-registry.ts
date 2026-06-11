import type { AuthService } from "../contracts/auth.contract";
import type { AdminService } from "../contracts/admin.contract";
import type { CommunityService } from "../contracts/community.contract";
import type { CoursesService } from "../contracts/courses.contract";
import type { DashboardService } from "../contracts/dashboard.contract";
import type { LessonsService } from "../contracts/lessons.contract";
import type { NotesService } from "../contracts/notes.contract";
import type { NotificationsService } from "../contracts/notifications.contract";
import type { ProgressService } from "../contracts/progress.contract";
import type { QuizzesService } from "../contracts/quizzes.contract";
import type { SubscriptionService } from "../contracts/subscription.contract";
import type { TutorService } from "../contracts/tutor.contract";
import { ApiAdminAdapter } from "../adapters/api/admin.adapter";
import { ApiAuthAdapter } from "../adapters/api/auth.adapter";
import { ApiCommunityAdapter } from "../adapters/api/community.adapter";
import { ApiCoursesAdapter } from "../adapters/api/courses.adapter";
import { ApiDashboardAdapter } from "../adapters/api/dashboard.adapter";
import { ApiLessonsAdapter } from "../adapters/api/lessons.adapter";
import { ApiNotesAdapter } from "../adapters/api/notes.adapter";
import { ApiNotificationsAdapter } from "../adapters/api/notifications.adapter";
import { ApiProgressAdapter } from "../adapters/api/progress.adapter";
import { ApiQuizzesAdapter } from "../adapters/api/quizzes.adapter";
import { ApiSubscriptionAdapter } from "../adapters/api/subscription.adapter";
import { ApiTutorAdapter } from "../adapters/api/tutor.adapter";
import { MockAdminAdapter } from "../adapters/mock/admin.adapter";
import { MockAuthAdapter } from "../adapters/mock/auth.adapter";
import { MockCommunityAdapter } from "../adapters/mock/community.adapter";
import { MockCoursesAdapter } from "../adapters/mock/courses.adapter";
import { MockDashboardAdapter } from "../adapters/mock/dashboard.adapter";
import { MockLessonsAdapter } from "../adapters/mock/lessons.adapter";
import { MockNotesAdapter } from "../adapters/mock/notes.adapter";
import { MockNotificationsAdapter } from "../adapters/mock/notifications.adapter";
import { MockProgressAdapter } from "../adapters/mock/progress.adapter";
import { MockQuizzesAdapter } from "../adapters/mock/quizzes.adapter";
import { MockSubscriptionAdapter } from "../adapters/mock/subscription.adapter";
import { MockTutorAdapter } from "../adapters/mock/tutor.adapter";
import { adapterMode, domainAdapterConfig, type AdapterMode, type DomainAdapterConfig } from "../../api/config/apiConfig";
import { logInfo } from "../../utils/logger";

export type ServiceAdapterMode = AdapterMode;

export interface ServiceRegistry {
  admin: AdminService;
  auth: AuthService;
  dashboard: DashboardService;
  courses: CoursesService;
  lessons: LessonsService;
  quizzes: QuizzesService;
  subscription: SubscriptionService;
  notes: NotesService;
  community: CommunityService;
  tutor: TutorService;
  notifications: NotificationsService;
  progress: ProgressService;
}

function createServiceRegistry(config: DomainAdapterConfig): ServiceRegistry {
  return {
    admin: config.admin === "api" ? new ApiAdminAdapter() : new MockAdminAdapter(),
    auth: config.auth === "api" ? new ApiAuthAdapter() : new MockAuthAdapter(),
    dashboard: config.dashboard === "api" ? new ApiDashboardAdapter() : new MockDashboardAdapter(),
    courses: config.courses === "api" ? new ApiCoursesAdapter() : new MockCoursesAdapter(),
    lessons: config.lessons === "api" ? new ApiLessonsAdapter() : new MockLessonsAdapter(),
    quizzes: config.quizzes === "api" ? new ApiQuizzesAdapter() : new MockQuizzesAdapter(),
    subscription: config.subscription === "api" ? new ApiSubscriptionAdapter() : new MockSubscriptionAdapter(),
    notes: config.notes === "api" ? new ApiNotesAdapter() : new MockNotesAdapter(),
    community: config.community === "api" ? new ApiCommunityAdapter() : new MockCommunityAdapter(),
    tutor: config.tutor === "api" ? new ApiTutorAdapter() : new MockTutorAdapter(),
    notifications: config.notifications === "api" ? new ApiNotificationsAdapter() : new MockNotificationsAdapter(),
    progress: config.progress === "api" ? new ApiProgressAdapter() : new MockProgressAdapter(),
  };
}

export const serviceAdapterMode: ServiceAdapterMode = adapterMode;
export { domainAdapterConfig };
const services = createServiceRegistry(domainAdapterConfig);

// Log per-domain adapter modes for debugging mixed mock/API setups.
logInfo("Service registry initialized", {
  globalMode: serviceAdapterMode,
  admin: domainAdapterConfig.admin,
  auth: domainAdapterConfig.auth,
  quizzes: domainAdapterConfig.quizzes,
  courses: domainAdapterConfig.courses,
  dashboard: domainAdapterConfig.dashboard,
});

export function getAuthService(): AuthService {
  return services.auth;
}

export function getAdminService(): AdminService {
  return services.admin;
}

export function getDashboardService(): DashboardService {
  return services.dashboard;
}

export function getCoursesService(): CoursesService {
  return services.courses;
}

export function getLessonsService(): LessonsService {
  return services.lessons;
}

export function getQuizzesService(): QuizzesService {
  return services.quizzes;
}

export function getSubscriptionService(): SubscriptionService {
  return services.subscription;
}

export function getNotesService(): NotesService {
  return services.notes;
}

export function getCommunityService(): CommunityService {
  return services.community;
}

export function getTutorService(): TutorService {
  return services.tutor;
}

export function getNotificationsService(): NotificationsService {
  return services.notifications;
}

export function getProgressService(): ProgressService {
  return services.progress;
}
