export interface TagFilterItem {
  id: string;
  name: string;
  count: number;
}

export interface GetPublishedPostsParams {
  /** 태그 이름. `전체`이거나 생략 시 필터 없음 */
  tag?: string;
  sort?: string;
  page_size?: number;
  start_cursor?: string;
}

export interface GetPublishedPostsResponse {
  posts: Post[];
  hasMore: boolean;
  next_cursor: string | null;
}

export interface Post {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  tags?: string[];
  author?: string;
  date?: string;
  modifiedDate?: string;
  slug?: string;
}
