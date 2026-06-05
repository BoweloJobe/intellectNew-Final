import type { CommunityPageData } from "../models/community";
import type { CreatePostInput, CreatePostResult } from "./contracts/community.contract";
import { getCommunityService } from "./factory/service-registry";

export async function getCommunityPageData(): Promise<CommunityPageData> {
  return getCommunityService().getCommunityPageData();
}

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  return getCommunityService().createPost(input);
}

export async function likeDiscussion(discussionId: string): Promise<void> {
  await getCommunityService().likeDiscussion(discussionId);
}

export async function unlikeDiscussion(discussionId: string): Promise<void> {
  await getCommunityService().unlikeDiscussion(discussionId);
}

export async function bookmarkDiscussion(discussionId: string): Promise<void> {
  await getCommunityService().bookmarkDiscussion(discussionId);
}

export async function unbookmarkDiscussion(discussionId: string): Promise<void> {
  await getCommunityService().unbookmarkDiscussion(discussionId);
}

export async function joinStudyGroup(groupName: string): Promise<void> {
  await getCommunityService().joinStudyGroup(groupName);
}

export async function leaveStudyGroup(groupName: string): Promise<void> {
  await getCommunityService().leaveStudyGroup(groupName);
}

export async function followTopic(topic: string): Promise<void> {
  await getCommunityService().followTopic(topic);
}

export async function unfollowTopic(topic: string): Promise<void> {
  await getCommunityService().unfollowTopic(topic);
}

export function getDiscussionTrendingScore(discussion: {
  likes: number;
  replies: number;
  hoursAgo: number;
}): number {
  const engagementScore = discussion.likes * 2 + discussion.replies * 3;
  const recencyBoost = Math.max(0, 36 - discussion.hoursAgo) * 0.8;

  return engagementScore + recencyBoost;
}
