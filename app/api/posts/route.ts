import { getPublishedPosts } from '@/lib/notion';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const tag = searchParams.get('tag') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const startCursor = searchParams.get('startCursor') || undefined;
  const pageSize = Number(searchParams.get('pageSize')) || undefined;

  const response = await getPublishedPosts({
    tag,
    sort,
    start_cursor: startCursor,
    page_size: pageSize,
  });

  return NextResponse.json(response);
}
