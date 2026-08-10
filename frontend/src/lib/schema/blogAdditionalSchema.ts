export interface BlogFaqItem {
  question: string;
  answer: string;
}

export interface BlogReviewData {
  itemName: string;
  itemType?: string;
  ratingValue: number;
  authorName: string;
  reviewBody: string;
}

// Structured-data text fields should be plain text -- strips any HTML tags
// (which also neutralizes an embedded "</script>" that could otherwise
// break out of the injected <script> tag) and trims whitespace.
function sanitizeText(value?: string | null): string {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").trim();
}

function buildFaqPageSchema(faqs: BlogFaqItem[]) {
  const cleaned = faqs
    .map((f) => ({ question: sanitizeText(f.question), answer: sanitizeText(f.answer) }))
    .filter((f) => f.question && f.answer);
  if (cleaned.length === 0) return null;

  return {
    "@type": "FAQPage",
    mainEntity: cleaned.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}

function buildReviewSchema(review: BlogReviewData) {
  const itemName = sanitizeText(review.itemName);
  const authorName = sanitizeText(review.authorName);
  const reviewBody = sanitizeText(review.reviewBody);
  const rating = Math.min(5, Math.max(1, Number(review.ratingValue) || 0));
  if (!itemName || !authorName || !reviewBody || !rating) return null;

  return {
    "@type": "Review",
    itemReviewed: {
      "@type": sanitizeText(review.itemType) || "Product",
      name: itemName,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: rating,
      bestRating: 5,
      worstRating: 1,
    },
    author: {
      "@type": "Person",
      name: authorName,
    },
    reviewBody,
  };
}

/**
 * Builds a single JSON-LD payload combining a blog post's FAQPage + Review
 * structured data. Uses an @graph wrapper only when both are present;
 * returns just the one schema (with its own @context) when only one is
 * present, and null when neither is -- callers should render no script
 * tag at all in that case.
 */
export function getBlogAdditionalSchema(
  faqs: BlogFaqItem[] | undefined | null,
  review: BlogReviewData | undefined | null
) {
  const faqSchema = faqs && faqs.length ? buildFaqPageSchema(faqs) : null;
  const reviewSchema = review ? buildReviewSchema(review) : null;

  if (faqSchema && reviewSchema) {
    return {
      "@context": "https://schema.org",
      "@graph": [faqSchema, reviewSchema],
    };
  }
  if (faqSchema) {
    return { "@context": "https://schema.org", ...faqSchema };
  }
  if (reviewSchema) {
    return { "@context": "https://schema.org", ...reviewSchema };
  }
  return null;
}
