import { useState, useEffect, useCallback } from 'react';
import SearchHero from '@/components/SearchHero';
import LoadingScreen from '@/components/LoadingScreen';
import ResultsView from '@/components/ResultsView';
import AuthModal from '@/components/AuthModal';
import Questionnaire from '@/components/Questionnaire';
import SavedSearchesModal from '@/components/SavedSearchesModal';
import ScrollWidgets from '@/components/ScrollWidgets';
import CursorIcons from '@/components/CursorIcons';
import { searchProductAsync } from '@/services/productService';
import { saveUserSearch } from '@/services/userService';
import { detectCategory, getCategoryConfig } from '@/lib/questionnaire';
import type { ProductSearchResult } from '@/types';
import type { QuestionnaireAnswers, CategoryConfig } from '@/lib/questionnaire';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, History, AlertCircle } from 'lucide-react';

type AppState = 'search' | 'questionnaire' | 'loading' | 'results';

function App() {
  const [state, setState] = useState<AppState>('search');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ProductSearchResult | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | undefined>(undefined);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [questionnaireConfig, setQuestionnaireConfig] = useState<CategoryConfig | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<QuestionnaireAnswers | undefined>(undefined);
  const [detectedCat, setDetectedCat] = useState<string | null>(null);
  const { user, signOut } = useAuth();

  // Perform search asynchronously using productService & save to search history
  const doSearch = useCallback(
    async (q: string, answers?: QuestionnaireAnswers, category?: string) => {
      setQuery(q);
      setSearchError(null);
      setActiveJobId(undefined);
      setState('loading');

      // Update URL search parameter (?q=...) without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('q', q);
      if (category) url.searchParams.set('cat', category);
      window.history.pushState({}, '', url.toString());

      // Fire non-blocking save to user history if authenticated
      if (user) {
        saveUserSearch(user.id, q, category, answers).catch(() => {});
      }

      const res = await searchProductAsync(q, answers, category, user?.id);

      if (res.status === 'success') {
        // Minimum load animation feel (800ms) for UI smoothness
        setTimeout(() => {
          setResult(res.data);
          setState('results');
        }, 800);
      } else if (res.status === 'active_job') {
        setActiveJobId(res.jobId);
        setState('loading');
      } else {
        setSearchError(res.message);
        setState('search');
      }
    },
    [user]
  );

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);

      // Check if this is a broad category that needs a questionnaire
      const cat = detectCategory(q);
      const config = cat ? getCategoryConfig(cat) : null;

      if (config) {
        setDetectedCat(cat);
        setQuestionnaireConfig(config);
        setState('questionnaire');
      } else {
        // Specific product — search directly
        setPendingAnswers(undefined);
        doSearch(q);
      }
    },
    [doSearch]
  );

  // Sync state with URL search parameters on initial load & back/forward buttons
  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q');
      const urlCat = params.get('cat');

      if (urlQuery && urlQuery.trim()) {
        doSearch(urlQuery.trim(), undefined, urlCat || undefined);
      } else if (!urlQuery && state === 'results') {
        setState('search');
        setQuery('');
        setResult(null);
      }
    };

    // Initial load URL check
    handleUrlSync();

    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [doSearch]);

  const handleQuestionnaireComplete = (answers: QuestionnaireAnswers) => {
    setPendingAnswers(answers);
    doSearch(query, answers, detectedCat || undefined);
    setQuestionnaireConfig(null);
  };

  const handleQuestionnaireBack = () => {
    setState('search');
    setQuestionnaireConfig(null);
    setDetectedCat(null);
  };

  const handleBack = () => {
    setState('search');
    setQuery('');
    setResult(null);
    setPendingAnswers(undefined);
    setDetectedCat(null);
    setSearchError(null);

    // Reset URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('cat');
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <ScrollWidgets />
      <CursorIcons />

      {/* Auth & History controls bar */}
      <div className="fixed top-4 right-4 z-[90] flex items-center gap-2">
        {user && (
          <button
            onClick={() => setSavedSearchesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/80 glass border border-blue-200 rounded-xl shadow-sm text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all active:scale-95"
            title="Saved Searches & History"
          >
            <History className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">History</span>
          </button>
        )}

        {state === 'search' && (
          <div>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-white/80 glass border border-blue-200 rounded-xl shadow-sm">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 text-white font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-600 hidden sm:block">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/80 glass border border-gray-200 rounded-xl shadow-sm text-sm font-semibold text-gray-500 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:block">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/80 glass border border-blue-200 rounded-xl shadow-sm text-sm font-bold text-blue-600 hover:bg-blue-50 hover:border-blue-400 hover:shadow-md transition-all active:scale-95"
              >
                <User className="w-4 h-4" />
                Login / Sign Up
              </button>
            )}
          </div>
        )}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {savedSearchesOpen && user && (
        <SavedSearchesModal
          userId={user.id}
          onClose={() => setSavedSearchesOpen(false)}
          onSelectSearch={(q, answers, category) => {
            doSearch(q, answers as QuestionnaireAnswers, category);
          }}
        />
      )}

      {searchError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4">
          <div className="flex items-center justify-between p-4 bg-red-50 border-2 border-red-200 rounded-2xl shadow-xl text-sm text-red-600 font-semibold">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
              <span>{searchError}</span>
            </div>
            <button
              onClick={() => setSearchError(null)}
              className="p-1 hover:bg-red-100 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {state === 'questionnaire' && questionnaireConfig && (
        <Questionnaire
          config={questionnaireConfig}
          searchQuery={query}
          onComplete={handleQuestionnaireComplete}
          onBack={handleQuestionnaireBack}
        />
      )}

      {state === 'loading' && <LoadingScreen query={query} jobId={activeJobId} />}

      {state === 'results' && result && (
        <ResultsView result={result} onBack={handleBack} onSearch={handleSearch} />
      )}

      {state === 'search' && <SearchHero onSearch={handleSearch} />}
    </div>
  );
}

export default App;
