import { revalidatePath, revalidateTag } from 'next/cache';

export const POSTS_CACHE_TAG = 'posts';

export const revalidateBlogCache = (): void => {
  revalidateTag(POSTS_CACHE_TAG);
  revalidatePath('/');
  revalidatePath('/blog/[slug]', 'page');
};
