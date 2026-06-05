import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  CommunityInteractionState,
  CommunityPageData,
  CommunityViewPreferences,
  Discussion,
  DiscussionDraft,
} from "../../models/community";
import {
  bookmarkDiscussion,
  createPost,
  followTopic,
  getCommunityPageData,
  getDiscussionTrendingScore,
  joinStudyGroup,
  leaveStudyGroup,
  likeDiscussion,
  unbookmarkDiscussion,
  unfollowTopic,
  unlikeDiscussion,
} from "../../services/community.service";
import { getAsyncErrorMessage } from "../../utils/async-errors";
import type { AsyncViewError, CommunitySummary, CommunityViewState, UserPreferences } from "../shared/types";
import { EMPTY_COMMUNITY_DATA } from "../shared/types";

type CommunityState = {
  joinedStudyGroups: string[];
  userPreferences: UserPreferences;
  communitySummary: CommunitySummary;
  communityViewState: CommunityViewState;
  communityError: AsyncViewError;
  communityData: CommunityPageData;
  communityViewPreferences: CommunityViewPreferences;
  communityInteractions: CommunityInteractionState;
  communityDrafts: DiscussionDraft[];
};

type CommunityContextValue = {
  state: CommunityState;
  hydrate: (partial: Partial<CommunityState>) => void;
  reloadCommunityData: () => void;
  setCommunityViewPreferences: (preferences: Partial<CommunityViewPreferences>) => void;
  setUserPreferences: (preferences: Partial<UserPreferences>) => void;
  toggleStudyGroupMembership: (groupName: string) => Promise<boolean>;
  toggleTopicFollow: (topic: string) => Promise<boolean>;
  toggleDiscussionLike: (discussionId: string) => Promise<boolean>;
  toggleDiscussionPin: (discussionId: string) => Promise<boolean>;
  createDiscussion: (title: string, body: string, category: string) => Promise<boolean>;
  createDiscussionDraft: (title?: string) => void;
  updateDiscussionDraft: (draftId: string, patch: { title?: string; body?: string }) => void;
  communityTrendingDiscussions: Discussion[];
};

const CommunityStateContext = createContext<CommunityContextValue | null>(null);

const DEFAULT_STATE: CommunityState = {
  joinedStudyGroups: [],
  userPreferences: {
    emailNotifications: true,
    weeklyProgressReport: true,
    favoriteTopics: [],
  },
  communitySummary: {
    discussionCount: 0,
    joinedGroupsCount: 0,
  },
  communityViewState: "loading",
  communityError: null,
  communityData: EMPTY_COMMUNITY_DATA,
  communityViewPreferences: {
    searchQuery: "",
    categoryFilter: "all",
    sortBy: "recent",
  },
  communityInteractions: {
    likedDiscussionIds: [] as string[],
    pinnedDiscussionIds: [] as string[],
  },
  communityDrafts: [],
};

export function CommunityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommunityState>(DEFAULT_STATE);

  const loadCommunityData = () => {
    setState((previous) => ({ ...previous, communityViewState: "loading", communityError: null }));

    void getCommunityPageData()
      .then((data) => {
        setState((previous) => ({
          ...previous,
          communityData: data,
          communityViewState: "success",
          communityError: null,
          communitySummary: {
            discussionCount: data.discussions.length,
            joinedGroupsCount: previous.joinedStudyGroups.length,
          },
        }));
      })
      .catch((error) => {
        setState((previous) => ({
          ...previous,
          communityViewState: "error",
          communityError: getAsyncErrorMessage(
            error,
            "Community data is temporarily unavailable. Retry to reload discussions and groups.",
          ),
        }));
      });
  };

  const value = useMemo<CommunityContextValue>(
    () => ({
      state,
      hydrate: (partial) => {
        setState((previous) => ({
          ...previous,
          ...partial,
          joinedStudyGroups: partial.joinedStudyGroups ?? previous.joinedStudyGroups,
          userPreferences: partial.userPreferences ?? previous.userPreferences,
          communitySummary: partial.communitySummary ?? previous.communitySummary,
          communityError: partial.communityError ?? previous.communityError,
          communityData: partial.communityData ?? previous.communityData,
          communityViewPreferences: partial.communityViewPreferences ?? previous.communityViewPreferences,
          communityInteractions: partial.communityInteractions ?? previous.communityInteractions,
          communityDrafts: partial.communityDrafts ?? previous.communityDrafts,
        }));
      },
      reloadCommunityData: loadCommunityData,
      setCommunityViewPreferences: (preferences) => {
        setState((previous) => ({
          ...previous,
          communityViewPreferences: {
            ...previous.communityViewPreferences,
            ...preferences,
          },
        }));
      },
      setUserPreferences: (preferences) => {
        setState((previous) => ({
          ...previous,
          userPreferences: {
            ...previous.userPreferences,
            ...preferences,
          },
        }));
      },
      toggleStudyGroupMembership: async (groupName) => {
        const alreadyJoined = state.joinedStudyGroups.includes(groupName);

        setState((previous) => {
          const nextGroups = alreadyJoined
            ? previous.joinedStudyGroups.filter((name) => name !== groupName)
            : [...previous.joinedStudyGroups, groupName];

          return {
            ...previous,
            joinedStudyGroups: nextGroups,
            communitySummary: {
              ...previous.communitySummary,
              joinedGroupsCount: nextGroups.length,
            },
          };
        });

        try {
          if (alreadyJoined) {
            await leaveStudyGroup(groupName);
          } else {
            await joinStudyGroup(groupName);
          }

          return true;
        } catch {
          setState((previous) => ({
            ...previous,
            joinedStudyGroups: state.joinedStudyGroups,
            communitySummary: {
              ...previous.communitySummary,
              joinedGroupsCount: state.joinedStudyGroups.length,
            },
          }));
          return false;
        }
      },
      toggleTopicFollow: async (topic) => {
        const alreadyFollowing = state.userPreferences.favoriteTopics.includes(topic);
        const nextTopics = alreadyFollowing
          ? state.userPreferences.favoriteTopics.filter((item) => item !== topic)
          : [...state.userPreferences.favoriteTopics, topic];

        setState((previous) => ({
          ...previous,
          userPreferences: {
            ...previous.userPreferences,
            favoriteTopics: nextTopics,
          },
        }));

        try {
          if (alreadyFollowing) {
            await unfollowTopic(topic);
          } else {
            await followTopic(topic);
          }

          return true;
        } catch {
          setState((previous) => ({
            ...previous,
            userPreferences: {
              ...previous.userPreferences,
              favoriteTopics: state.userPreferences.favoriteTopics,
            },
          }));
          return false;
        }
      },
      toggleDiscussionLike: async (discussionId: string) => {
        const alreadyLiked = state.communityInteractions.likedDiscussionIds.includes(discussionId);

        setState((previous) => {
          const nextLikedIds = alreadyLiked
            ? previous.communityInteractions.likedDiscussionIds.filter((id) => id !== discussionId)
            : [...previous.communityInteractions.likedDiscussionIds, discussionId];

          return {
            ...previous,
            communityInteractions: {
              ...previous.communityInteractions,
              likedDiscussionIds: nextLikedIds,
            },
            communityData: {
              ...previous.communityData,
              discussions: previous.communityData.discussions.map((discussion) => {
                if (discussion.id !== discussionId) {
                  return discussion;
                }

                return {
                  ...discussion,
                  likes: Math.max(0, discussion.likes + (alreadyLiked ? -1 : 1)),
                };
              }),
            },
          };
        });

        try {
          if (alreadyLiked) {
            await unlikeDiscussion(discussionId);
          } else {
            await likeDiscussion(discussionId);
          }

          return true;
        } catch {
          setState((previous) => ({
            ...previous,
            communityInteractions: {
              ...previous.communityInteractions,
              likedDiscussionIds: state.communityInteractions.likedDiscussionIds,
            },
            communityData: state.communityData,
          }));
          return false;
        }
      },
      toggleDiscussionPin: async (discussionId: string) => {
        const alreadyPinned = state.communityInteractions.pinnedDiscussionIds.includes(discussionId);

        setState((previous) => {
          const nextPinnedIds = alreadyPinned
            ? previous.communityInteractions.pinnedDiscussionIds.filter((id) => id !== discussionId)
            : [...previous.communityInteractions.pinnedDiscussionIds, discussionId];

          return {
            ...previous,
            communityInteractions: {
              ...previous.communityInteractions,
              pinnedDiscussionIds: nextPinnedIds,
            },
          };
        });

        try {
          if (alreadyPinned) {
            await unbookmarkDiscussion(discussionId);
          } else {
            await bookmarkDiscussion(discussionId);
          }

          return true;
        } catch {
          setState((previous) => ({
            ...previous,
            communityInteractions: {
              ...previous.communityInteractions,
              pinnedDiscussionIds: state.communityInteractions.pinnedDiscussionIds,
            },
          }));
          return false;
        }
      },
      createDiscussion: async (title: string, body: string, category: string): Promise<boolean> => {
        try {
          await createPost({ title, body, category });
          // Reload from backend to get the real post with its server-assigned ID.
          loadCommunityData();
          return true;
        } catch {
          return false;
        }
      },
      createDiscussionDraft: (title = "Untitled discussion") => {
        const now = new Date().toISOString();

        setState((previous) => ({
          ...previous,
          communityDrafts: [
            {
              id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              title,
              body: "",
              createdAt: now,
              updatedAt: now,
            },
            ...previous.communityDrafts,
          ],
        }));
      },
      updateDiscussionDraft: (draftId, patch) => {
        setState((previous) => ({
          ...previous,
          communityDrafts: previous.communityDrafts.map((draft) => {
            if (draft.id !== draftId) {
              return draft;
            }

            return {
              ...draft,
              title: patch.title ?? draft.title,
              body: patch.body ?? draft.body,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      communityTrendingDiscussions: [...state.communityData.discussions]
        .sort((left, right) => getDiscussionTrendingScore(right) - getDiscussionTrendingScore(left))
        .slice(0, 5),
    }),
    [state],
  );

  return <CommunityStateContext.Provider value={value}>{children}</CommunityStateContext.Provider>;
}

export function useCommunityState(): CommunityContextValue {
  const context = useContext(CommunityStateContext);

  if (!context) {
    throw new Error("useCommunityState must be used within CommunityProvider");
  }

  return context;
}
