import {
  createSubscriptionApprovalMock,
  getCurrentSubscriptionStatusMock,
  getSubscriptionOverviewMock,
  getSubscriptionPlansMock,
  verifySubscriptionReturnMock,
} from "../../../mocks/subscription.mock";
import type { SubscriptionService } from "../../contracts/subscription.contract";
import { withMockDelay } from "../../mock-utils";

export class MockSubscriptionAdapter implements SubscriptionService {
  async getPlans() {
    return withMockDelay(getSubscriptionPlansMock(), 180);
  }

  async getSubscriptionOverview(input: Parameters<SubscriptionService["getSubscriptionOverview"]>[0]) {
    return withMockDelay(getSubscriptionOverviewMock(input), 150);
  }

  async createSubscriptionApproval(input: Parameters<SubscriptionService["createSubscriptionApproval"]>[0]) {
    return withMockDelay(createSubscriptionApprovalMock(input), 220);
  }

  async verifySubscriptionReturn(input: Parameters<SubscriptionService["verifySubscriptionReturn"]>[0]) {
    return withMockDelay(verifySubscriptionReturnMock(input), 420);
  }

  async getCurrentSubscriptionStatus(input: Parameters<SubscriptionService["getCurrentSubscriptionStatus"]>[0]) {
    return withMockDelay(getCurrentSubscriptionStatusMock(input), 180);
  }
}
