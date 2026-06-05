import type { CommunityPageData } from "../../models/community";

export type CreatePostInput = {
  title: string;
  body: string;
  category: string;
};

export type CreatePostResult = {
  id: string;
  title: string;
  category: string;
};

export interface CommunityService {
  getCommunityPageData(): Promise<CommunityPageData>;
  createPost(input: CreatePostInput): Promise<CreatePostResult>;
  likeDiscussion(discussionId: string): Promise<void>;
  unlikeDiscussion(discussionId: string): Promise<void>;
  bookmarkDiscussion(discussionId: string): Promise<void>;
  unbookmarkDiscussion(discussionId: string): Promise<void>;
  joinStudyGroup(groupName: string): Promise<void>;
  leaveStudyGroup(groupName: string): Promise<void>;
  followTopic(topic: string): Promise<void>;
  unfollowTopic(topic: string): Promise<void>;
}