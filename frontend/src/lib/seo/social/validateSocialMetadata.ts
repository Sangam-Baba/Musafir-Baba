import { ResolvedSocialMetadataOutput, ValidationResult } from './types';
import { socialValidationConfig } from './socialValidationConfig';

export function validateSocialMetadata(resolved: ResolvedSocialMetadataOutput): ValidationResult {
  const errors: string[] = [];

  // Open Graph Validation
  const og = resolved.openGraph;
  if (!og.images) {
    errors.push('Missing Open Graph image');
  } else if (!og.images.startsWith('https://')) {
    errors.push('Open Graph image must be served over HTTPS');
  }

  if (!og.title) {
    errors.push('Missing Open Graph title');
  } else if (og.title.length > socialValidationConfig.openGraph.maxTitleLength) {
    errors.push(`Open Graph title is longer than recommended (${socialValidationConfig.openGraph.maxTitleLength} chars)`);
  }

  if (!og.description) {
    errors.push('Missing Open Graph description');
  } else if (og.description.length > socialValidationConfig.openGraph.maxDescriptionLength) {
    errors.push(`Open Graph description is longer than recommended (${socialValidationConfig.openGraph.maxDescriptionLength} chars)`);
  }

  // Twitter Validation
  const tw = resolved.twitter;
  if (tw.images && !tw.images.startsWith('https://')) {
    errors.push('Twitter image must be served over HTTPS');
  }

  if (tw.title && tw.title.length > socialValidationConfig.twitter.maxTitleLength) {
    errors.push(`Twitter title is longer than recommended (${socialValidationConfig.twitter.maxTitleLength} chars)`);
  }

  if (tw.description && tw.description.length > socialValidationConfig.twitter.maxDescriptionLength) {
    errors.push(`Twitter description is longer than recommended (${socialValidationConfig.twitter.maxDescriptionLength} chars)`);
  }

  return {
    status: errors.length > 0 ? 'Needs Attention' : 'Ready',
    errors
  };
}
