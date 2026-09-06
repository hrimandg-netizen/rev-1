import { useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

interface LoadingScreenProps {
  query: string;
  jobId?: string;
}

const STEPS = [
  { icon: '◎', text: 'Scanning 6 marketplaces...' },
  { icon: '★', text: 'Reading customer reviews...' },
  { icon: '✓', text: 'Verifying product authenticity...' },
  { icon: '⚡', text: 'Comparing prices and ratings...' },
  { icon: '♥', text: 'Finding the best seller for you...' },
];

export default function LoadingScreen({ query, jobId }: LoadingScreenProps) {
  const [step, setStep] = useState(0);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  // Animated steps fallback
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription if jobId is provided
  useEffect(() => {
    if (!jobId || !isSupabaseConfigured()) return;

    try {
      const supabase = getSupabase();
      const channel = supabase
        .channel(`scraping_job_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'scraping_jobs',
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            const updated = payload.new as { progress_message?: string; status?: string };
            if (updated.progress_message) {
              setLiveMessage(updated.progress_message);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Fallback to animated step text if Realtime subscription fails
    }
  }, [jobId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Radar animation */}
      <div className="relative w-48 h-48 mb-8">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-2 border-blue-200" />
        {/* Middle ring */}
        <div className="absolute inset-4 rounded-full border-2 border-blue-300" />
        {/* Inner ring */}
        <div className="absolute inset-8 rounded-full border-2 border-blue-400" />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse-glow" />
        </div>
        {/* Scanning line */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div
            className="absolute left-1/2 top-0 w-1/2 h-1/2 origin-bottom-left animate-spin-slow"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.4))',
            }}
          />
        </div>
        {/* Orbiting dots */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-blue-500 rounded-full animate-pulse-glow"
            style={{
              top: `${['10%', '50%', '80%'][i]}`,
              left: `${['20%', '75%', '40%'][i]}`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Query display */}
      <div className="mb-6 text-center">
        <span className="text-sm text-gray-400 font-medium">Searching for</span>
        <div className="text-xl font-bold text-gray-800 mt-1">"{query}"</div>
        {liveMessage && (
          <div className="mt-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block animate-pulse">
            Live Worker: {liveMessage}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="w-full max-w-md space-y-3">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 transition-all duration-300 ${
              i <= step ? 'opacity-100' : 'opacity-30'
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold transition-all ${
                i < step
                  ? 'bg-blue-500 text-white'
                  : i === step
                  ? 'bg-blue-100 text-blue-600 animate-pulse-glow border-2 border-blue-400'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < step ? '✓' : s.icon}
            </div>
            <span
              className={`text-sm font-medium ${
                i <= step ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {s.text}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-8 h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-sky-400 rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
