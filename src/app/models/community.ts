export interface Discussion {
  id: string;
  title: string;
  body: string;
  author: string;
  avatar: string;
  category: string;
  replies: number;
  likes: number;
  time: string;
  hoursAgo: number;
}

export type DiscussionSort = "recent" | "most-liked" | "most-replies" | "trending";

export interface CommunityViewPreferences {
  searchQuery: string;
  categoryFilter: string;
  sortBy: DiscussionSort;
}

export interface DiscussionDraft {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityInteractionState {
  likedDiscussionIds: string[];
  pinnedDiscussionIds: string[];
}

export type GroupActivity = "Very Active" | "Active";

export interface StudyGroup {
  name: string;
  members: number;
  activity: GroupActivity;
  category: string;
}

export interface CommunityPageData {
  discussions: Discussion[];
  studyGroups: StudyGroup[];
  popularTopics: string[];
}
