'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function clearCache(path?: string, tag?: string) {
  if (tag) {
    revalidateTag(tag);
  }
  if (path) {
    revalidatePath(path, 'layout');
  }
}
