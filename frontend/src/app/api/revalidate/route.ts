import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { path, type = 'page', tag, token } = await request.json();

    // In a real app, you would check a secret token here
    // if (token !== process.env.REVALIDATION_TOKEN) {
    //   return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    // }

    if (tag) {
      revalidateTag(tag);
    }

    if (path) {
      revalidatePath(path, type as any);
    }
    
    return NextResponse.json({ revalidated: true, now: Date.now(), tag, path, type });

    return NextResponse.json({
      revalidated: false,
      now: Date.now(),
      message: 'Missing path to revalidate',
    }, { status: 400 });
  } catch (err) {
    console.error("Revalidation error:", err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
