import { ResolvedSocialMetadataOutput } from './types';

export interface PreviewData {
  facebook: { title: string; description: string; image: string; siteName: string; };
  twitter: { title: string; description: string; image: string; card: string; };
  linkedin: { title: string; image: string; domain: string; };
  whatsapp: { title: string; description: string; image: string; domain: string; };
}

export function getPreviewModel(resolved: ResolvedSocialMetadataOutput, domain: string = 'musafirbaba.com', siteName: string = 'Musafir Baba'): PreviewData {
  const og = resolved.openGraph;
  const tw = resolved.twitter;

  return {
    facebook: {
      title: og.title,
      description: og.description,
      image: og.images,
      siteName,
    },
    twitter: {
      title: tw.title || og.title,
      description: tw.description || og.description,
      image: tw.images || og.images,
      card: tw.card || 'summary_large_image',
    },
    linkedin: {
      title: og.title,
      image: og.images,
      domain,
    },
    whatsapp: {
      title: og.title,
      description: og.description,
      image: og.images,
      domain,
    }
  };
}
