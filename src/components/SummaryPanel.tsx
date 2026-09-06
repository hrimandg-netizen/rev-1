import { useState, useEffect } from 'react';
import type { ProductSearchResult, RatingCategory } from '@/types';
import { Sparkles, Award, Star, IndianRupee, Package, Users, Info, Bell, BellRing, Database } from 'lucide-react';
import RatingBreakdownModal from './RatingBreakdownModal';
import { useAuth } from '@/hooks/useAuth';
import { trackProduct, untrackProduct, isProductTracked } from '@/services/userService';

interface SummaryPanelProps {
  result: ProductSearchResult;
}

export default function SummaryPanel({ result }: SummaryPanelProps) {
  const { bestPick, priceRange, averageRating, results } = result;
  const savings = Math.round(((priceRange.max - bestPick.price) / priceRange.max) * 100);
  const totalReviews = results.reduce((sum, r) => sum + r.reviewCount, 0);
  const [breakdownRating, setBreakdownRating] = useState<RatingCategory | null>(null);
  const [tracked, setTracked] = useState(false);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user && result.productId) {
      isProductTracked(user.id, result.productId).then(setTracked);
    }
  }, [user, result.productId]);

  const handleToggleTrack = async () => {
    if (!user) {
      setTrackError('Please sign in to track product prices.');
      return;
    }

    if (!result.productId) {
      setTrackError('Price tracking requires a registered database product.');
      return;
    }

    setTrackLoading(true);
    setTrackError(null);

    if (tracked) {
      const success = await untrackProduct(user.id, result.productId);
      if (success) setTracked(false);
    } else {
      const res = await trackProduct(user.id, result.productId, bestPick.price);
      if (res.success) {
        setTracked(true);
      } else {
        setTrackError(res.error || 'Failed to track product');
      }
    }
    setTrackLoading(false);
  };

  return (
    <>
      <div className="relative bg-white rounded-3xl border-2 border-blue-200 shadow-xl shadow-blue-100 overflow-hidden animate-scale-in">
        {/* Top gradient strip */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 animate-gradient" />

        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 rounded-full">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700">AI Summary</span>
              </div>
              {result.isSynthetic ? (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-semibold">
                  <Info className="w-3 h-3 text-amber-500" />
                  <span>Demo Mode (Synthetic Scanner)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-semibold">
                  <Database className="w-3 h-3 text-blue-500" />
                  <span>Real Scraped Pipeline Data</span>
                </div>
              )}
            </div>

            {/* Track Price Button */}
            {result.productId && (
              <button
                onClick={handleToggleTrack}
                disabled={trackLoading}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                  tracked
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                {tracked ? <BellRing className="w-4 h-4 text-blue-600" /> : <Bell className="w-4 h-4 text-blue-500" />}
                <span>{tracked ? 'Currently Tracked' : 'Track Price'}</span>
              </button>
            )}
          </div>

          {trackError && (
            <div className="mb-4 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center justify-between">
              <span>{trackError}</span>
              <button onClick={() => setTrackError(null)} className="ml-2 font-bold">✕</button>
            </div>
          )}

          {/* Product info */}
          <div className="mb-5">
            <h2 className="text-2xl font-extrabold text-gray-800">{result.productName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-400">Model:</span>
              <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md text-sm font-mono font-semibold text-blue-600">
                {result.modelNumber}
              </span>
              <span className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium text-gray-500">
                {result.category}
              </span>
            </div>
          </div>

          {/* Summary text */}
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-5">
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">{result.summary}</p>
          </div>

          {/* Best pick highlight */}
          <div className="relative p-5 bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl border-2 border-blue-300 mb-5">
            <div className="absolute -top-3 left-5 flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-500 to-sky-500 text-white text-xs font-bold rounded-full shadow-md">
              <Award className="w-3.5 h-3.5" /> RECOMMENDED
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${bestPick.color} text-white font-extrabold text-2xl shadow-lg`}>
                  {bestPick.logo}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-gray-800">{bestPick.name}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3.5 h-3.5 fill-blue-400 text-blue-400" />
                      <span className="font-semibold text-gray-700">{bestPick.starRating}</span>
                    </div>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{bestPick.reviewCount.toLocaleString()} reviews</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-blue-600">{bestPick.overallScore}</div>
                <div className="text-xs text-gray-400 font-medium">/ 10 overall</div>
              </div>
            </div>
            {/* Best pick mini ratings — clickable */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {bestPick.ratings.slice(0, 6).map((r, i) => (
                <button
                  key={i}
                  onClick={() => setBreakdownRating(r)}
                  className="flex flex-col items-center p-2 bg-white/70 rounded-lg hover:bg-white hover:shadow-md transition-all cursor-pointer group"
                >
                  <span className="text-2xl font-extrabold text-blue-600 group-hover:scale-110 transition-transform">{r.score}</span>
                  <span className="text-[10px] text-gray-400 font-medium text-center leading-tight">{r.label}</span>
                  <Info className="w-2.5 h-2.5 text-gray-300 group-hover:text-blue-400 mt-0.5 transition-colors" />
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-gray-300 flex items-center gap-1">
              <Info className="w-2.5 h-2.5" />
              Click any score to see the full calculation breakdown
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<IndianRupee className="w-5 h-5 text-blue-500" />}
              label="Best Price"
              value={`Rs ${bestPick.price.toLocaleString()}`}
              sub={`Save ${savings}%`}
            />
            <StatCard
              icon={<Star className="w-5 h-5 text-sky-500" />}
              label="Avg Rating"
              value={`${averageRating} / 5`}
              sub="Across all sites"
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-blue-500" />}
              label="Reviews"
              value={totalReviews.toLocaleString()}
              sub="Total analyzed"
            />
            <StatCard
              icon={<Package className="w-5 h-5 text-sky-500" />}
              label="Marketplaces"
              value={`${results.length}`}
              sub="Compared"
            />
          </div>
        </div>
      </div>

      {breakdownRating && (
        <RatingBreakdownModal
          rating={breakdownRating}
          marketplaceName={`${bestPick.name} (Best Pick)`}
          onClose={() => setBreakdownRating(null)}
        />
      )}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="p-3 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-400">{label}</span>
      </div>
      <div className="text-lg font-extrabold text-gray-800">{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}
