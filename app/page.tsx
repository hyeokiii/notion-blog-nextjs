import { getPublishedPosts, getTags } from '@/lib/notion';
import { TagSectionClient } from '@/components/TagSection.client';
import { ProfileSection } from '@/components/ProfileSection';
import { ContactSection } from '@/components/ContactSection';
import HeaderSection from '@/components/HeaderSection';
// import PostListClient from '@/components/features/blog/PostList.client';
// import PostList from '@/components/features/blog/PostList';

import { Suspense } from 'react';

import TagSectionSkeleton from '@/components/TagSectionSkeleton';
import PostList from '@/components/features/blog/PostList';
interface BlogProps {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}

export default async function Blog({ searchParams }: BlogProps) {
  const { tag, sort } = await searchParams;
  const selectedTag = tag;
  const selectedSort = sort;
  const tags = getTags();

  const postsPromise = await getPublishedPosts({ tag: selectedTag, sort: selectedSort });

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr_220px]">
        {/* 좌측 사이드바 */}
        <aside className="order-2 md:order-none">
          <Suspense fallback={<TagSectionSkeleton />}>
            <TagSectionClient tags={tags} selectedTag={selectedTag} />
          </Suspense>
        </aside>
        <div className="order-3 space-y-8 md:order-none">
          {/* 섹션 제목 */}
          <HeaderSection selectedTag={selectedTag || ''} />

          {/* 블로그 카드 그리드 */}
          {/* <PostListClient /> */}
          {/* <PostList posts={posts} /> */}
          {/* <Suspense fallback={<PostListSkeleton />}>
            <PostListSuspense key={`${selectedTag}-${selectedSort}`} postsPromise={postsPromise} />
          </Suspense> */}
          <PostList posts={postsPromise.posts} />
        </div>
        {/* 우측 사이드바 */}
        <aside className="order-1 flex flex-col gap-6 md:order-none">
          <ProfileSection />
          <ContactSection />
        </aside>
      </div>
    </div>
  );
}
