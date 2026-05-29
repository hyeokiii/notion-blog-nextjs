'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { use, useEffect } from 'react';
import { PostCard } from '@/components/features/blog/PostCard';
// import { Button } from '@/components/ui/button';
import { POSTS_PAGE_SIZE } from '@/lib/constants';
import type { GetPublishedPostsResponse } from '@/types/blog';
import { useInView } from 'react-intersection-observer';
import { Loader2 } from 'lucide-react';

interface PostListProps {
  postsPromise: Promise<GetPublishedPostsResponse>;
}

export default function PostListSuspense({ postsPromise }: PostListProps) {
  const searchParams = useSearchParams();
  const tag = searchParams.get('tag') || '전체';
  const sort = searchParams.get('sort') || 'latest';
  const pageSize = 2;
  const initialPage = use(postsPromise);

  const fetchPosts = async ({
    pageParam,
  }: {
    pageParam?: string | null;
  }): Promise<GetPublishedPostsResponse> => {
    const params = new URLSearchParams();
    params.set('sort', sort);
    params.set('pageSize', String(POSTS_PAGE_SIZE));

    if (tag && tag !== '전체') {
      params.set('tag', tag);
    }

    if (pageParam) {
      params.set('startCursor', pageParam);
    }

    params.set('pageSize', pageSize.toString());

    const response = await fetch(`/api/posts?${params.toString()}`);

    if (!response.ok) {
      throw new Error('게시물을 불러오지 못했습니다.');
    }

    return response.json();
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isError, error } = useInfiniteQuery(
    {
      queryKey: ['posts', tag, sort, pageSize],
      queryFn: fetchPosts,
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.hasMore && lastPage.next_cursor ? lastPage.next_cursor : undefined,
      initialData: {
        pages: [initialPage],
        pageParams: [undefined],
      },
    }
  );

  const { ref, inView } = useInView({
    threshold: 0,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (isError) {
    return (
      <p className="text-destructive py-8 text-center text-sm">
        {error instanceof Error ? error.message : '게시물을 불러오지 못했습니다.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {posts.map((post, index) => (
          <Link href={`/blog/${post.slug}`} key={post.id}>
            <PostCard post={post} isFirst={index === 0} />
          </Link>
        ))}
      </div>
      {hasNextPage && !isFetchingNextPage && <div ref={ref} className="h-10" />}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          <span className="text-muted-foreground text-sm">로딩중...</span>
        </div>
      )}
      {/* {hasNextPage && (
        <div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            aria-busy={isFetchingNextPage}
          >
            {isFetchingNextPage ? '불러오는 중...' : '더보기'}
          </Button>
        </div>
      )} */}
    </div>
  );
}
