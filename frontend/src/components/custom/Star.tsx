import { Star, StarHalf } from "lucide-react";

type StarRatingProps = {
  rating: number; // ex: 1.5, 2, 2.5, 4.5
  max?: number;
};

const StarRating = ({ rating, max = 5 }: StarRatingProps) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = max - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex gap-1 text-[#FE5300]">
      {/* Full Stars */}
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={16} fill="currentColor" />
      ))}

      {/* Half Star */}
      {hasHalfStar && <StarHalf size={16} fill="currentColor" />}

      {/* Empty Stars */}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={16} />
      ))}
    </div>
  );
};

export default StarRating;
