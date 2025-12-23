export interface ReviewInterface {
  rating: number;
  name: string;
  comment: string;
}
export const getReviewSchema = (reviews: ReviewInterface) => ({
  "@context": "https://schema.org",
  "@type": "Review",
  reviewRating: {
    "@type": "Rating",
    ratingValue: reviews.rating,
    bestRating: "5",
  },
  author: {
    "@type": "Person",
    name: reviews.name,
  },
  reviewBody: reviews.comment,
});
