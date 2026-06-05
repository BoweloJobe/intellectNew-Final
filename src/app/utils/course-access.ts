import type { SubscriptionOverview, SubscriptionStatus } from "../models/subscription";

export const FREE_PREVIEW_LESSON_COUNT = 3;

export type CourseAccessDecision = {
  isAccessible: boolean;
  isPremiumContent: boolean;
  reason: "free" | "premium_requires_pro";
};

function hasPremiumStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "expiring";
}

export function hasPremiumAccess(subscription: Pick<SubscriptionOverview, "status" | "hasProAccess">): boolean {
  return subscription.hasProAccess && hasPremiumStatus(subscription.status);
}

export function getCourseAccessDecision(input: {
  lessonOrder: number;
  subscription: Pick<SubscriptionOverview, "status" | "hasProAccess">;
  isFreePreview?: boolean;
}): CourseAccessDecision {
  // Instructor-authored isFreePreview explicitly grants free access.
  if (input.isFreePreview === true) {
    return {
      isAccessible: true,
      isPremiumContent: false,
      reason: "free",
    };
  }

  const isPremiumContent = input.lessonOrder > FREE_PREVIEW_LESSON_COUNT;

  if (!isPremiumContent) {
    return {
      isAccessible: true,
      isPremiumContent: false,
      reason: "free",
    };
  }

  if (hasPremiumAccess(input.subscription)) {
    return {
      isAccessible: true,
      isPremiumContent: true,
      reason: "free",
    };
  }

  return {
    isAccessible: false,
    isPremiumContent: true,
    reason: "premium_requires_pro",
  };
}
