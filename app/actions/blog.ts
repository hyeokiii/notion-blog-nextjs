'use server';

import { createPost } from '@/lib/notion';
import { revalidateBlogCache } from '@/lib/revalidatePosts';
import { z } from 'zod';
const postSchema = z.object({
  title: z.string().min(1, { message: '제목을 입력해주세요.' }),
  slug: z
    .string()
    .min(1, { message: 'Slug를 입력해주세요.' })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: '영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.',
    }),
  tag: z.string().min(1, { message: '태그를 선택해주세요.' }),
  content: z.string().min(1, { message: '내용은 최소 10자 이상 입력해주세요.' }),
});

export interface PostFormData {
  title: string;
  slug: string;
  tag: string;
  content: string;
}

export interface PostFormState {
  message: string;
  errors?: {
    title?: string[];
    slug?: string[];
    tag?: string[];
    content?: string[];
  };
  formData?: PostFormData;
  success?: boolean;
}
export async function createPostAction(prevState: PostFormState, formData: FormData) {
  // const title = formData.get('title') as string;
  // const tag = formData.get('tag') as string;
  // const content = formData.get('content') as string;

  // const { title, tag, content } = Object.fromEntries(formData);

  const rawFormData = {
    title: formData.get('title') as string,
    slug: formData.get('slug') as string,
    tag: formData.get('tag') as string,
    content: formData.get('content') as string,
  };

  const validatedFields = postSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: '유효성 검사에 실패했습니다.',
      formData: rawFormData,
    };
  }
  try {
    const { title, slug, tag, content } = validatedFields.data;

    await createPost({
      title,
      slug,
      tag,
      content,
    });
    revalidateBlogCache();
    return {
      success: true,
      message: '블로그 포스트가 성공적으로 생성되었습니다.',
    };
  } catch (err) {
    console.error(err);
    return {
      message: '블로그 포스트 생성에 실패했습니다.',
      formData: rawFormData,
    };
  }
  // revalidatePath('/');
  // redirect('/');
}
