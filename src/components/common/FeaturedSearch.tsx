import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

interface SearchSuggestion {
  candidate: string;
  score: number;
}

interface ArticleResult {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  score: number;
  highlights: string[];
}

interface FeaturedSearchProps {
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
}

export function FeaturedSearch({ onSearch, autoFocus = true }: FeaturedSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ArticleResult[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // 模拟同义词建议
    const mockSuggestions: SearchSuggestion[] = [
      { candidate: query + ' 芯片', score: 0.9 },
      { candidate: query + ' 自动驾驶', score: 0.85 },
      { candidate: '新能源' + query, score: 0.8 },
    ];

    setSuggestions(mockSuggestions.slice(0, 5));
  }, [query]);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    
    setIsSearching(true);
    setShowResults(true);
    
    if (onSearch) {
      onSearch(q);
    }

    // 模拟搜索
    setTimeout(() => {
      const mockResults: ArticleResult[] = [
        {
          id: '1',
          title: `关于 "${q}" 的深度分析`,
          summary: '本文深入探讨了...（模拟结果）',
          source: '科技日报记者',
          publishedAt: '2026-09-22',
          score: 95,
          highlights: ['深度', '分析', '科技'],
        },
        {
          id: '2',
          title: `${q} 最新进展`,
          summary: '最新数据显示...（模拟结果）',
          source: '财经观察',
          publishedAt: '2026-09-21',
          score: 88,
          highlights: ['最新', '进展', '数据'],
        },
      ];
      
      setResults(mockResults);
      setIsSearching(false);
    }, 300);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch(query);
            }
          }}
          placeholder="智能搜索：AI芯片、自动驾驶..."
          className="flex-1 outline-none text-gray-900 placeholder-gray-400"
          autoFocus={autoFocus}
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <button
          onClick={() => handleSearch(query)}
          disabled={!query.trim() || isSearching}
          className={`
            px-4 py-1.5 rounded-md text-sm font-medium transition-colors
            ${!query.trim() 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400'}
          `}
        >
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && query.length >= 2 && !showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden z-50">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
            智能建议
          </div>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSuggestionClick(s.candidate)}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-500" />
                {s.candidate}
              </span>
              <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                匹配度: {(s.score * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
            搜索结果 ({results.length})
          </div>
          {results.map((r, i) => (
            <div key={i} className="px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="font-medium text-blue-600">{r.source}</span>
                <span>•</span>
                <span>{r.publishedAt}</span>
                <span className="ml-auto">得分: {r.score}</span>
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-1">
                {r.title}
              </h4>
              <p className="text-xs text-gray-600 line-clamp-2">
                {r.summary}
              </p>
              {r.highlights.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.highlights.map((h, j) => (
                    <span key={j} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded">
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FeaturedSearch;
