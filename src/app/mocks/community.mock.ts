import type { CommunityPageData } from "../models/community";

/**
 * Empty mock data for community page.
 * 
 * In mock mode, we return no demo/fake content.
 * Users will see an empty state with guidance to start their first discussion.
 * Real community data is loaded from the backend in API mode.
 */
export const communityPageMock: CommunityPageData = {
  discussions: [],
  studyGroups: [],
  popularTopics: [],
};
