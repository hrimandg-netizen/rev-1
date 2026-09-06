import { useState, useEffect } from 'react';
import { X, History, Trash2, ArrowRight, Loader2, Search } from 'lucide-react';
import { getUserSearches, deleteUserSearch, type UserSearchRecord } from '@/services/userService';

interface SavedSearchesModalProps {
  userId: string;
  onClose: () => void;
  onSelectSearch: (query: string, answers?: Record<string, string | number>, category?: string) => void;
}

export default function SavedSearchesModal({
  userId,
  onClose,
  onSelectSearch,
}: SavedSearchesModalProps) {
  const [searches, setSearches] = useState<UserSearchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getUserSearches(userId).then((data) => {
      if (active) {
        setSearches(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const success = await deleteUserSearch(userId, id);
    if (success) {
      setSearches((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/20 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden animate-scale-in max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient strip */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-400 animate-gradient shrink-0" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-800">Search History & Saved Items</h2>
          </div>
          <p className="text-sm text-gray-400">
            Re-run your past product scans and tracked searches
          </p>
        </div>

        {/* List content */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-500" />
              <span>Loading search history...</span>
            </div>
          ) : searches.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30 text-blue-500" />
              <p className="font-bold text-gray-700">No search history yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Your future product scans will automatically be saved here.
              </p>
            </div>
          ) : (
            searches.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectSearch(item.query, item.answers, item.category || undefined);
                  onClose();
                }}
                className="group flex items-center justify-between p-4 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-2xl cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                      {item.query}
                    </span>
                    {item.category && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    {item.answers && Object.keys(item.answers).length > 0 && (
                      <>
                        <span>·</span>
                        <span>{Object.keys(item.answers).length} preferences saved</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete search"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="p-2 text-blue-500 group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
