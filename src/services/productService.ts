import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { searchProduct as syntheticSearch } from '@/lib/searchEngine';
import type { ProductSearchResult, MarketplaceResult, RatingCategory, ReviewSnippet } from '@/types';
import type { QuestionnaireAnswers } from '@/lib/questionnaire';

export type ProductServiceResponse =
  | { status: 'success'; data: ProductSearchResult }
  | { status: 'active_job'; jobId: string; message: string }
  | { status: 'error'; message: string };

/**
 * Searches for a product using Supabase PostgreSQL data if available,
 * handles scraping_jobs status checks, or falls back to the synthetic demo engine.
 */
export async function searchProductAsync(
  query: string,
  answers?: QuestionnaireAnswers,
  category?: string,
  userId?: string
): Promise<ProductServiceResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { status: 'error', message: 'Query cannot be empty' };
  }

  // Fallback if Supabase is not configured
  if (!isSupabaseConfigured()) {
    const syntheticResult = syntheticSearch(trimmed, answers, category);
    return {
      status: 'success',
      data: { ...syntheticResult, isSynthetic: true },
    };
  }

  try {
    const supabase = getSupabase();

    // 1. Check if an active worker/job exists for this query if userId is present
    if (userId) {
      const { data: activeJobData } = await supabase
        .from('scraping_jobs' as any)
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'scraping', 'analyzing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const activeJob = activeJobData as any;

      if (activeJob) {
        return {
          status: 'active_job',
          jobId: activeJob.id,
          message: activeJob.progress_message || 'Scanner pipeline active...',
        };
      }

      // Check if the most recent job for this search explicitly failed
      const { data: failedJobData } = await supabase
        .from('scraping_jobs' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const failedJob = failedJobData as any;

      if (failedJob && failedJob.error_message) {
        return {
          status: 'error',
          message: failedJob.error_message,
        };
      }
    }

    // 2. Query Supabase products for real data (where is_synthetic = false)
    const { data: productData, error: prodError } = await supabase
      .from('products' as any)
      .select('*')
      .or(`product_name.ilike.%${trimmed}%,model_number.ilike.%${trimmed}%`)
      .eq('is_synthetic', false)
      .limit(1)
      .maybeSingle();

    const product = productData as any;

    if (prodError) {
      console.warn('Supabase product query error, using synthetic fallback:', prodError.message);
      const fallback = syntheticSearch(trimmed, answers, category);
      return { status: 'success', data: { ...fallback, isSynthetic: true } };
    }

    // If real product record exists in DB
    if (product) {
      const { data: listingsData } = await supabase
        .from('marketplace_listings' as any)
        .select('*')
        .eq('product_id', product.id)
        .eq('is_synthetic', false);

      const listings = (listingsData as any[]) || [];

      if (listings.length > 0) {
        const marketplaceResults: MarketplaceResult[] = [];

        for (const listing of listings) {
          // Fetch marketplaces details
          const { data: mpData } = await supabase
            .from('marketplaces' as any)
            .select('*')
            .eq('id', listing.marketplace_id)
            .single();

          const mp = mpData as any;

          // Fetch ratings
          const { data: ratingsData } = await supabase
            .from('rating_categories' as any)
            .select('*')
            .eq('listing_id', listing.id);

          // Fetch reviews
          const { data: reviewsData } = await supabase
            .from('reviews' as any)
            .select('*')
            .eq('listing_id', listing.id);

          const ratings: RatingCategory[] = ((ratingsData as any[]) || []).map((r) => ({
            label: r.label,
            score: r.score,
            icon: r.icon,
            detail: r.detail,
            weight: r.weight,
            breakdown: (r.breakdown as any) || [],
          }));

          const reviews: ReviewSnippet[] = ((reviewsData as any[]) || []).map((rev) => ({
            author: rev.author,
            text: rev.text,
            rating: rev.rating,
            date: rev.date_text,
            marketplace: rev.marketplace_name,
            verified: rev.verified,
            sentiment: rev.sentiment,
          }));

          marketplaceResults.push({
            id: listing.id,
            name: mp ? mp.name : listing.marketplace_id,
            logo: mp ? mp.logo : 'M',
            color: mp ? mp.color : 'from-blue-500 to-sky-500',
            price: listing.price,
            originalPrice: listing.original_price,
            discount: listing.discount,
            currency: listing.currency,
            starRating: listing.star_rating,
            reviewCount: listing.review_count,
            deliveryDays: listing.delivery_days,
            ratings,
            pros: (listing.pros as string[]) || [],
            cons: (listing.cons as string[]) || [],
            reviews,
            inStock: listing.in_stock,
            url: listing.url,
            overallScore: listing.overall_score,
          });
        }

        marketplaceResults.sort((a, b) => b.overallScore - a.overallScore);
        const bestPick = marketplaceResults[0];
        const prices = marketplaceResults.map((r) => r.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgRating =
          Math.round(
            (marketplaceResults.reduce((sum, r) => sum + r.starRating, 0) /
              marketplaceResults.length) *
              10
          ) / 10;

        return {
          status: 'success',
          data: {
            query: trimmed,
            productName: product.product_name,
            modelNumber: product.model_number,
            category: product.category,
            results: marketplaceResults,
            bestPick,
            summary: product.summary || `Analysis complete for ${product.product_name}`,
            priceRange: { min: minPrice, max: maxPrice },
            averageRating: avgRating,
            productId: product.id,
            isSynthetic: false,
          },
        };
      }
    }

    // 3. No real product/worker found -> Use synthetic demo generator as fallback
    const syntheticResult = syntheticSearch(trimmed, answers, category);
    return {
      status: 'success',
      data: { ...syntheticResult, isSynthetic: true },
    };
  } catch (err) {
    console.warn('Supabase service connection failure, using synthetic fallback:', err);
    const syntheticResult = syntheticSearch(trimmed, answers, category);
    return {
      status: 'success',
      data: { ...syntheticResult, isSynthetic: true },
    };
  }
}
