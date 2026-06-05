import { communityPageMock } from "../../../mocks/community.mock";
import type { CommunityService, CreatePostInput, CreatePostResult } from "../../contracts/community.contract";
import { withMockDelay } from "../../mock-utils";

async function mockInteractionRequest(): Promise<void> {
  await withMockDelay(null, 180);
}

export class MockCommunityAdapter implements CommunityService {
  async getCommunityPageData() {
    return withMockDelay(communityPageMock);
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    await withMockDelay(null, 700);
    return {
      id: `draft-${Date.now()}`,
      title: input.title,
      category: input.category,
    };
  }

  async likeDiscussion(): Promise<void> {
    await mockInteractionRequest();
  }

  async unlikeDiscussion(): Promise<void> {
    await mockInteractionRequest();
  }

  async bookmarkDiscussion(): Promise<void> {
    await mockInteractionRequest();
  }

  async unbookmarkDiscussion(): Promise<void> {
    await mockInteractionRequest();
  }

  async joinStudyGroup(): Promise<void> {
    await mockInteractionRequest();
  }

  async leaveStudyGroup(): Promise<void> {
    await mockInteractionRequest();
  }

  async followTopic(): Promise<void> {
    await mockInteractionRequest();
  }

  async unfollowTopic(): Promise<void> {
    await mockInteractionRequest();
  }
}