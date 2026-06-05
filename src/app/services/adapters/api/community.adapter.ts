import type { CommunityService, CreatePostInput, CreatePostResult } from "../../contracts/community.contract";
import type { CommunityPageData, Discussion } from "../../../models/community";
import { httpClient, toApiError } from "../../../api";
import { readStoredAuthSession } from "../../../auth/auth-storage";

// ─── Backend response shapes ──────────────────────────────────────────────────

interface BackendPost {
  id: string;
  title: string;
  body: string;
  category: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  likes: number;
  isLikedByMe: boolean;
  isBookmarkedByMe: boolean;
  replies: number;
  createdAt: string;
  hoursAgo: number;
}

type BackendPostsResponse = { status: string; data: { posts: BackendPost[] } };
type BackendCreatePostResponse = { status: string; data: { post: BackendPost } };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = readStoredAuthSession()?.tokens?.accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatHoursAgo(hoursAgo: number): string {
  if (hoursAgo < 1) return "Just now";
  if (hoursAgo < 24) return `${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`;
  const days = Math.floor(hoursAgo / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function toAvatar(authorName: string): string {
  const seed = encodeURIComponent(authorName.toLowerCase().replace(/\s+/g, "-"));
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

function toDiscussion(post: BackendPost): Discussion {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    author: post.authorName,
    avatar: toAvatar(post.authorName),
    category: post.category,
    replies: post.replies,
    likes: post.likes,
    time: formatHoursAgo(post.hoursAgo),
    hoursAgo: post.hoursAgo,
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

export class ApiCommunityAdapter implements CommunityService {
  async getCommunityPageData(): Promise<CommunityPageData> {
    try {
      const resp = await httpClient.get<BackendPostsResponse>("/community/posts", {
        headers: authHeaders(),
      });
      const discussions: Discussion[] = resp.data.posts.map(toDiscussion);
      return {
        discussions,
        // Study groups and topics are not yet backend-managed.
        // Return empty arrays rather than fake data.
        studyGroups: [],
        popularTopics: Array.from(new Set(discussions.map((d) => d.category))).sort(),
      };
    } catch (error) {
      throw toApiError(error, { operation: "community.getCommunityPageData" });
    }
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult> {
    try {
      const resp = await httpClient.post<BackendCreatePostResponse>(
        "/community/posts",
        { body: { title: input.title, body: input.body, category: input.category }, headers: authHeaders() },
      );
      const post = resp.data.post;
      return { id: post.id, title: post.title, category: post.category };
    } catch (error) {
      throw toApiError(error, { operation: "community.createPost" });
    }
  }

  async likeDiscussion(discussionId: string): Promise<void> {
    try {
      await httpClient.post(
        `/community/posts/${encodeURIComponent(discussionId)}/like`,
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "community.likeDiscussion" });
    }
  }

  async unlikeDiscussion(discussionId: string): Promise<void> {
    try {
      await httpClient.delete(
        `/community/posts/${encodeURIComponent(discussionId)}/like`,
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "community.unlikeDiscussion" });
    }
  }

  async bookmarkDiscussion(discussionId: string): Promise<void> {
    try {
      await httpClient.post(
        `/community/posts/${encodeURIComponent(discussionId)}/bookmark`,
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "community.bookmarkDiscussion" });
    }
  }

  async unbookmarkDiscussion(discussionId: string): Promise<void> {
    try {
      await httpClient.delete(
        `/community/posts/${encodeURIComponent(discussionId)}/bookmark`,
        { headers: authHeaders() },
      );
    } catch (error) {
      throw toApiError(error, { operation: "community.unbookmarkDiscussion" });
    }
  }

  // Study groups and topic follows are UI-only preferences not yet backend-managed.
  // These are no-ops in API mode — they do not throw, so the UI optimistic update
  // still applies but is not persisted to the backend.
  async joinStudyGroup(_groupName: string): Promise<void> {
    return;
  }

  async leaveStudyGroup(_groupName: string): Promise<void> {
    return;
  }

  async followTopic(_topic: string): Promise<void> {
    return;
  }

  async unfollowTopic(_topic: string): Promise<void> {
    return;
  }
}