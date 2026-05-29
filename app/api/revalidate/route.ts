import { revalidateBlogCache } from '@/lib/revalidatePosts';
import { NextResponse, type NextRequest } from 'next/server';

const getSecret = (request: NextRequest): string | null => {
  const querySecret = request.nextUrl.searchParams.get('secret');
  if (querySecret) return querySecret;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }

  return null;
};

export async function POST(request: NextRequest) {
  const secret = getSecret(request);

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
  }

  revalidateBlogCache();

  return NextResponse.json({ revalidated: true, timestamp: Date.now() });
}

export async function GET(request: NextRequest) {
  return POST(request);
}
