import React, { useState, useCallback } from "react";
import {
  Search,
  Globe,
  Settings,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader,
  Target,
  Database,
  Zap,
} from "lucide-react";

export default function DeepScraperPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/deep-scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      
      // Add to search history
      setSearchHistory(prev => [
        { query: query.trim(), timestamp: Date.now() },
        ...prev.slice(0, 4)
      ]);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#121212] font-inter">
      {/* Header */}
      <div className="border-b border-[#EDEDED] dark:border-[#333333] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[#219079] to-[#9BC56E] dark:from-[#4DD0B1] dark:to-[#B5D16A] flex items-center justify-center mr-3">
              <Search size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E1E1E] dark:text-white">
                Deep Scraper
              </h1>
              <p className="text-sm text-[#70757F] dark:text-[#A8ADB4]">
                Advanced web scraping and analysis
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-[#F7F7F7] dark:hover:bg-[#262626] rounded-2xl transition-colors">
            <Settings size={20} className="text-[#70757F] dark:text-[#A8ADB4]" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search Interface */}
        <div className="mb-8">
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-3xl p-6 shadow-sm dark:shadow-none">
            <div className="mb-4">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your search query (e.g., 'current stock price of AAPL', 'latest news about AI models')..."
                className="w-full min-h-[80px] text-lg resize-none border-none outline-none placeholder-[#B4B4B4] dark:placeholder-[#70757F] bg-transparent text-[#1E1E1E] dark:text-white"
                disabled={loading}
              />
            </div>

            <div className="h-px bg-[#EDEDED] dark:bg-[#333333] mb-4"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2 px-4 py-2 bg-[#F5F5F5] dark:bg-[#262626] border border-[#DADADA] dark:border-[#404040] rounded-2xl">
                  <Globe size={16} className="text-[#219079] dark:text-[#4DD0B1]" />
                  <span className="text-sm font-medium text-[#414141] dark:text-[#D1D1D1]">
                    Deep Search
                  </span>
                </div>
                <div className="text-xs text-[#70757F] dark:text-[#A8ADB4]">
                  {query.length}/1000
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={!query.trim() || loading}
                className="px-6 py-3 bg-gradient-to-r from-[#219079] to-[#9BC56E] dark:from-[#4DD0B1] dark:to-[#B5D16A] text-white rounded-2xl font-medium hover:from-[#1E8169] hover:to-[#8AB05E] dark:hover:from-[#3BC4A3] dark:hover:to-[#A8C75C] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {loading ? (
                  <Loader size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && !loading && (
            <div className="mt-4">
              <p className="text-sm font-medium text-[#70757F] dark:text-[#A8ADB4] mb-2">
                Recent searches:
              </p>
              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(item.query)}
                    className="px-3 py-1 bg-[#F5F5F5] dark:bg-[#262626] text-[#414141] dark:text-[#D1D1D1] text-sm rounded-xl hover:bg-[#EDEDED] dark:hover:bg-[#333333] transition-colors"
                  >
                    {item.query.length > 30 ? item.query.substring(0, 30) + '...' : item.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-3xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#219079] to-[#9BC56E] dark:from-[#4DD0B1] dark:to-[#B5D16A] rounded-full mb-4">
              <Loader size={24} className="text-white animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-[#1E1E1E] dark:text-white mb-2">
              Deep Searching...
            </h3>
            <p className="text-[#70757F] dark:text-[#A8ADB4]">
              Analyzing web sources and extracting relevant information
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white dark:bg-[#1E1E1E] border border-red-200 dark:border-red-800 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle size={20} className="text-red-500" />
              <h3 className="text-lg font-semibold text-[#1E1E1E] dark:text-white">
                Search Failed
              </h3>
            </div>
            <p className="text-[#70757F] dark:text-[#A8ADB4]">{error}</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Main Result */}
            {results.found && (
              <div className="bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-3xl p-6 shadow-sm dark:shadow-none">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle size={20} className="text-green-500" />
                  <h3 className="text-lg font-semibold text-[#1E1E1E] dark:text-white">
                    Result Found
                  </h3>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-lg">
                      Score: {(results.score * 100).toFixed(0)}%
                    </div>
                    <button
                      onClick={() => handleCopy(results.snippet)}
                      className="p-1 hover:bg-[#F7F7F7] dark:hover:bg-[#262626] rounded-lg transition-colors"
                    >
                      {copied ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <Copy size={16} className="text-[#70757F] dark:text-[#A8ADB4]" />
                      )}
                    </button>
                  </div>
                </div>

                {results.source && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-[#F9F9F9] dark:bg-[#262626] rounded-2xl">
                    <ExternalLink size={16} className="text-[#70757F] dark:text-[#A8ADB4]" />
                    <a
                      href={results.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#219079] dark:text-[#4DD0B1] hover:underline truncate"
                    >
                      {results.source}
                    </a>
                  </div>
                )}

                <div className="prose max-w-none">
                  <p className="text-[#1E1E1E] dark:text-white whitespace-pre-wrap leading-relaxed">
                    {results.snippet}
                  </p>
                </div>

                {/* AI Answer */}
                {results.answer && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-[#219079]/5 to-[#9BC56E]/5 dark:from-[#4DD0B1]/10 dark:to-[#B5D16A]/10 rounded-2xl border border-[#219079]/20 dark:border-[#4DD0B1]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={16} className="text-[#219079] dark:text-[#4DD0B1]" />
                      <h4 className="font-semibold text-[#1E1E1E] dark:text-white">
                        AI Analysis
                      </h4>
                    </div>
                    <p className="text-[#1E1E1E] dark:text-white leading-relaxed">
                      {results.answer}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* No Results */}
            {!results.found && (
              <div className="bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-3xl p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <Search size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#1E1E1E] dark:text-white mb-2">
                  No Results Found
                </h3>
                <p className="text-[#70757F] dark:text-[#A8ADB4]">
                  No confident results were found for your query. Try refining your search terms.
                </p>
              </div>
            )}

            {/* Debug Information */}
            {results.debug && (
              <div className="bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-3xl overflow-hidden">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#F9F9F9] dark:hover:bg-[#262626] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database size={20} className="text-[#70757F] dark:text-[#A8ADB4]" />
                    <h3 className="font-semibold text-[#1E1E1E] dark:text-white">
                      Debug Information
                    </h3>
                  </div>
                  {showDebug ? (
                    <ChevronUp size={20} className="text-[#70757F] dark:text-[#A8ADB4]" />
                  ) : (
                    <ChevronDown size={20} className="text-[#70757F] dark:text-[#A8ADB4]" />
                  )}
                </button>

                {showDebug && (
                  <div className="px-6 pb-6 border-t border-[#EDEDED] dark:border-[#333333]">
                    {results.debug.search_results && (
                      <div className="mb-4">
                        <h4 className="font-medium text-[#1E1E1E] dark:text-white mb-2">
                          Search Results Found:
                        </h4>
                        <div className="space-y-1">
                          {results.debug.search_results.map((url, index) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-[#219079] dark:text-[#4DD0B1] hover:underline truncate"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {results.debug.steps && (
                      <div>
                        <h4 className="font-medium text-[#1E1E1E] dark:text-white mb-2">
                          Processing Steps:
                        </h4>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {results.debug.steps.map((step, index) => (
                            <div
                              key={index}
                              className="text-sm text-[#70757F] dark:text-[#A8ADB4] font-mono bg-[#F9F9F9] dark:bg-[#262626] px-3 py-2 rounded-lg"
                            >
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        {!results && !loading && (
          <div className="text-center mt-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#219079]/10 to-[#9BC56E]/10 dark:from-[#4DD0B1]/10 dark:to-[#B5D16A]/10 rounded-full mb-4">
              <Target size={24} className="text-[#219079] dark:text-[#4DD0B1]" />
            </div>
            <h3 className="text-xl font-semibold text-[#1E1E1E] dark:text-white mb-2">
              Ready to Deep Search
            </h3>
            <p className="text-[#70757F] dark:text-[#A8ADB4] mb-6 max-w-md mx-auto">
              Enter your query above to start deep scraping the web for comprehensive, 
              relevant information using advanced extraction techniques.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-2xl">
                <h4 className="font-medium text-[#1E1E1E] dark:text-white mb-2">
                  Smart Search
                </h4>
                <p className="text-sm text-[#70757F] dark:text-[#A8ADB4]">
                  Automatically searches multiple sources and follows internal links
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-2xl">
                <h4 className="font-medium text-[#1E1E1E] dark:text-white mb-2">
                  JS Rendering
                </h4>
                <p className="text-sm text-[#70757F] dark:text-[#A8ADB4]">
                  Handles dynamic content and JavaScript-heavy websites
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-[#1E1E1E] border border-[#E2E2E2] dark:border-[#333333] rounded-2xl">
                <h4 className="font-medium text-[#1E1E1E] dark:text-white mb-2">
                  AI Analysis
                </h4>
                <p className="text-sm text-[#70757F] dark:text-[#A8ADB4]">
                  Uses AI to extract and summarize the most relevant information
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}