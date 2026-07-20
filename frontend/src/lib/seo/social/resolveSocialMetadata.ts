import { ResolveSocialMetadataParams, ResolvedSocialMetadataOutput, SourceMap } from './types';
import { validateSocialMetadata } from './validateSocialMetadata';
import { socialTypeMap } from './socialTypeMap';

export function resolveSocialMetadata(params: ResolveSocialMetadataParams): ResolvedSocialMetadataOutput {
  const { resolvedMetadata, socialOverrides, moduleType } = params;

  // Derive final values
  const ogTitle = socialOverrides?.openGraph?.title || resolvedMetadata.title;
  const ogTitleSource = socialOverrides?.openGraph?.title ? 'Custom OG Title' : 'SEO Meta Title';
  const ogTitleStatus = socialOverrides?.openGraph?.title ? 'Manual Override' : 'Automatic';

  const ogDescription = socialOverrides?.openGraph?.description || resolvedMetadata.description;
  const ogDescriptionSource = socialOverrides?.openGraph?.description ? 'Custom OG Description' : 'SEO Meta Description';
  const ogDescriptionStatus = socialOverrides?.openGraph?.description ? 'Manual Override' : 'Automatic';

  const ogImage = socialOverrides?.openGraph?.image || resolvedMetadata.image;
  const ogImageSource = socialOverrides?.openGraph?.image ? 'Custom OG Image' : 'Default Image';
  const ogImageStatus = socialOverrides?.openGraph?.image ? 'Manual Override' : 'Automatic';

  const defaultType = socialTypeMap[moduleType] || 'website';
  const ogType = socialOverrides?.openGraph?.type || defaultType;
  const ogTypeSource = socialOverrides?.openGraph?.type ? 'Custom OG Type' : 'Module Default';
  const ogTypeStatus = socialOverrides?.openGraph?.type ? 'Manual Override' : 'Automatic';

  // Twitter inherits OG unless explicitly overridden or inheritOpenGraph is false
  const inheritOg = socialOverrides?.twitter?.inheritOpenGraph !== false;

  const twTitle = socialOverrides?.twitter?.title || (inheritOg ? ogTitle : resolvedMetadata.title);
  const twTitleSource = socialOverrides?.twitter?.title ? 'Custom Twitter Title' : (inheritOg ? 'Inherited OG Title' : 'SEO Meta Title');
  const twTitleStatus = socialOverrides?.twitter?.title ? 'Manual Override' : 'Automatic';

  const twDescription = socialOverrides?.twitter?.description || (inheritOg ? ogDescription : resolvedMetadata.description);
  const twDescriptionSource = socialOverrides?.twitter?.description ? 'Custom Twitter Description' : (inheritOg ? 'Inherited OG Description' : 'SEO Meta Description');
  const twDescriptionStatus = socialOverrides?.twitter?.description ? 'Manual Override' : 'Automatic';

  const twImage = socialOverrides?.twitter?.image || (inheritOg ? ogImage : resolvedMetadata.image);
  const twImageSource = socialOverrides?.twitter?.image ? 'Custom Twitter Image' : (inheritOg ? 'Inherited OG Image' : 'Default Image');
  const twImageStatus = socialOverrides?.twitter?.image ? 'Manual Override' : 'Automatic';

  const defaultCard = 'summary_large_image';
  const twCard = socialOverrides?.twitter?.card || defaultCard;
  const twCardSource = socialOverrides?.twitter?.card ? 'Custom Twitter Card' : 'Default Card';
  const twCardStatus = socialOverrides?.twitter?.card ? 'Manual Override' : 'Automatic';

  const sources: SourceMap = {
    openGraph: {
      title: { status: ogTitleStatus, source: ogTitleSource },
      description: { status: ogDescriptionStatus, source: ogDescriptionSource },
      image: { status: ogImageStatus, source: ogImageSource },
      type: { status: ogTypeStatus, source: ogTypeSource },
    },
    twitter: {
      title: { status: twTitleStatus, source: twTitleSource },
      description: { status: twDescriptionStatus, source: twDescriptionSource },
      image: { status: twImageStatus, source: twImageSource },
      card: { status: twCardStatus, source: twCardSource },
    }
  };

  const output: ResolvedSocialMetadataOutput = {
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: ogImage,
      type: ogType,
    },
    twitter: {
      title: twTitle,
      description: twDescription,
      images: twImage,
      card: twCard,
    },
    sources,
    validation: { status: 'Ready', errors: [] }
  };

  // Run validation
  output.validation = validateSocialMetadata(output);

  return output;
}
