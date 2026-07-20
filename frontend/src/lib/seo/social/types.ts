export type ModuleType = 'BLOG' | 'PACKAGE' | 'VISA' | 'NEWS' | 'DESTINATION' | 'WEBPAGE';

export interface SocialOverrides {
  openGraph?: {
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    type?: string;
  };
  twitter?: {
    inheritOpenGraph?: boolean;
    title?: string;
    description?: string;
    image?: string;
    card?: string;
  };
}

export interface ResolvedMetadataInput {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}

export interface ResolveSocialMetadataParams {
  resolvedMetadata: ResolvedMetadataInput;
  socialOverrides?: SocialOverrides;
  moduleType: ModuleType;
}

export interface ValidationResult {
  status: 'Ready' | 'Needs Attention';
  errors: string[];
}

export interface SourceMap {
  openGraph: {
    title: { status: 'Automatic' | 'Manual Override'; source: string };
    description: { status: 'Automatic' | 'Manual Override'; source: string };
    image: { status: 'Automatic' | 'Manual Override'; source: string };
    type: { status: 'Automatic' | 'Manual Override'; source: string };
  };
  twitter: {
    title: { status: 'Automatic' | 'Manual Override'; source: string };
    description: { status: 'Automatic' | 'Manual Override'; source: string };
    image: { status: 'Automatic' | 'Manual Override'; source: string };
    card: { status: 'Automatic' | 'Manual Override'; source: string };
  };
}

export interface ResolvedSocialMetadataOutput {
  openGraph: {
    title: string;
    description: string;
    images: string;
    type: string;
  };
  twitter: {
    title: string;
    description: string;
    images: string;
    card: string;
  };
  sources: SourceMap;
  validation: ValidationResult;
}
