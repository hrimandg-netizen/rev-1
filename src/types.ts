export interface RatingBreakdownFactor {
  label: string;
  value: number; // raw value
  unit: string;
  maxUnit: number;
  contribution: number; // points contributed to score
  source: string; // where this data came from
}

export interface RatingCategory {
  label: string;
  score: number; // out of 10
  icon: string;
  detail: string;
  weight: number;
  breakdown: RatingBreakdownFactor[];
}

export interface ReviewSnippet {
  author: string;
  text: string;
  rating: number; // out of 5
  date: string;
  marketplace: string;
  verified: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface MarketplaceResult {
  id: string;
  name: string;
  logo: string; // emoji or short text
  color: string; // tailwind gradient classes
  price: number;
  originalPrice: number;
  discount: number;
  currency: string;
  starRating: number; // out of 5
  reviewCount: number;
  deliveryDays: string;
  ratings: RatingCategory[];
  pros: string[];
  cons: string[];
  reviews: ReviewSnippet[];
  inStock: boolean;
  url: string;
  overallScore: number; // weighted out of 10
}

export interface ProductSearchResult {
  query: string;
  productName: string;
  modelNumber: string;
  category: string;
  results: MarketplaceResult[];
  bestPick: MarketplaceResult;
  summary: string;
  priceRange: { min: number; max: number };
  averageRating: number;
  productId?: string;
  isSynthetic?: boolean;
}

