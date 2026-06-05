import type {
  CreateSubscriptionApprovalInput,
  CreateSubscriptionApprovalResult,
  SubscriptionOverview,
  SubscriptionPlan,
  VerifySubscriptionReturnInput,
  VerifySubscriptionReturnResult,
} from "../../models/subscription";

export interface SubscriptionService {
  getPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionOverview(input: { userId: string; currentTier: "free" | "pro" }): Promise<SubscriptionOverview>;
  createSubscriptionApproval(input: CreateSubscriptionApprovalInput): Promise<CreateSubscriptionApprovalResult>;
  verifySubscriptionReturn(input: VerifySubscriptionReturnInput): Promise<VerifySubscriptionReturnResult>;
  getCurrentSubscriptionStatus(input: { userId: string; currentTier: "free" | "pro" }): Promise<SubscriptionOverview>;
}
