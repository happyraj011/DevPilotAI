'use client';

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Generation {
  id: string;
  prompt: string;
  language: string;
  code: string;
  createdAt: string;
  userId?: string | null;
}

interface HistoryResponse {
  generations: Generation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const LANGUAGES = ['Python', 'JavaScript', 'C++', 'TypeScript'];

const getLanguageAlias = (lang: string): string => {
  const map: Record<string, string> = {
    'Python': 'python',
    'JavaScript': 'javascript',
    'C++': 'cpp',
    'TypeScript': 'typescript',
  };
  return map[lang] || 'text';
};

const getLanguageColor = (lang: string): string => {
  const colors: Record<string, string> = {
    'Python': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'JavaScript': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'C++': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'TypeScript': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return colors[lang] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
};

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('Python');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Generation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<HistoryResponse['pagination'] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const fetchHistory = async (page: number = 1) => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch(`${API_URL}/api/history?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      const data: HistoryResponse = await response.json();
      setHistory(data.generations);
      setPagination(data.pagination);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedCode(null);
    setSelectedGeneration(null);

    try {
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || errorData.error || 'Failed to generate code';
        throw new Error(JSON.stringify({ error: errorData.error, message: errorMessage }));
      }

      const data: Generation = await response.json();
      setGeneratedCode(data.code);
      setSelectedGeneration(null); // Clear selected history when generating new code (this will show prompt section again)
      // Refresh history to show the new generation
      fetchHistory(1);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof Error) {
        try {
          const errorData = JSON.parse(err.message);
          if (errorData.error === 'OpenAI API quota exceeded' || errorData.message?.includes('quota')) {
            setError('OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing');
          } else {
            setError(errorData.message || errorData.error || err.message);
          }
        } catch {
          if (err.message.includes('quota') || err.message.includes('429')) {
            setError('OpenAI API quota exceeded. Please check your billing and plan details.');
          } else {
            setError(err.message || 'Failed to generate code');
          }
        }
      } else {
        setError('Failed to generate code');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      fetchHistory(newPage);
    }
  };

  const handleHistoryClick = (gen: Generation) => {
    setSelectedGeneration(gen);
    setGeneratedCode(null); // Clear newly generated code when selecting from history
    setPrompt(''); // Optional: clear prompt input
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent mb-3">
            Code Generation Copilot
          </h1>
          <p className="text-gray-400 text-lg">
            Generate code using AI from natural language prompts
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Corner: History */}
          <div className="lg:col-span-3">
            <div className="bg-black rounded-xl shadow-2xl border-2 border-gray-800/80 p-4 sticky top-4 ring-1 ring-cyan-500/10">
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                History
              </h2>

              {/* New Chat Button - Always visible at top */}
              <button
                onClick={() => {
                  setSelectedGeneration(null);
                  setGeneratedCode(null);
                  setPrompt('');
                }}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 mb-4 ${
                  !selectedGeneration && !generatedCode
                    ? 'border-cyan-500/60 bg-gray-900/50 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/30'
                    : 'border-gray-800/60 hover:border-cyan-500/40 hover:bg-gray-900/30 hover:shadow-md hover:ring-1 hover:ring-cyan-500/20'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">➕</span>
                  <span className="text-sm font-semibold text-white">New Chat</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Generate new code</p>
              </button>

              {isLoadingHistory ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-950/50 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No generations yet.</p>
                  <p className="text-xs mt-1">Create your first one!</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {history.map((gen) => (
                      <button
                        key={gen.id}
                        onClick={() => handleHistoryClick(gen)}
                        className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                          selectedGeneration?.id === gen.id
                            ? 'border-cyan-500/60 bg-gray-900/50 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500/30 scale-[1.02]'
                            : 'border-gray-800/60 hover:border-gray-700/80 hover:bg-gray-900/30 hover:shadow-md hover:ring-1 hover:ring-gray-700/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getLanguageColor(gen.language)}`}>
                                {gen.language}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-200 line-clamp-3 leading-relaxed">
                              {gen.prompt}
                            </p>
                            <p className="text-[10px] text-gray-500 mt-2">
                              {new Date(gen.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t border-gray-800/80">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600/60 to-blue-600/60 hover:from-cyan-600/80 hover:to-blue-600/80 disabled:from-gray-900 disabled:to-gray-900 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md shadow-cyan-500/10 disabled:shadow-none"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-gray-400 font-medium">
                        {pagination.page}/{pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600/60 to-blue-600/60 hover:from-cyan-600/80 hover:to-blue-600/80 disabled:from-gray-900 disabled:to-gray-900 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-md shadow-cyan-500/10 disabled:shadow-none"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column: Input and Code Display */}
          <div className="lg:col-span-9 space-y-6">
            {/* Input Form - Hide when history item is selected */}
            {!selectedGeneration && (
            <div className="bg-black rounded-xl shadow-2xl border border-gray-900/50 p-6">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center gap-2">
                <span className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></span>
                Enter Your Prompt
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Write a Python function to reverse a string"
                    className="w-full px-4 py-3 border-2 border-gray-900 bg-gray-950/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-gray-600 resize-none transition-all duration-200"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-900 bg-gray-950/50 rounded-xl focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white transition-all duration-200 cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang} className="bg-gray-950">
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full bg-gradient-to-r from-cyan-600/50 via-blue-600/50 to-purple-600/50 hover:from-cyan-600/70 hover:via-blue-600/70 hover:to-purple-600/70 disabled:from-gray-900 disabled:via-gray-900 disabled:to-gray-900 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md shadow-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/20 disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      Generating...
                    </span>
                  ) : (
                    'Generate Code'
                  )}
                </button>

                {error && (
                  <div className="bg-red-950/50 border-2 border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Code Display - Show only selected history OR newly generated code */}
            {(selectedGeneration || generatedCode) && (
              <div className="bg-black rounded-xl shadow-2xl border border-gray-900/50 p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1">
                    {selectedGeneration ? (
                      <h2 className="text-xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {selectedGeneration.prompt}
                      </h2>
                    ) : (
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></span>
                        Generated Code
                      </h2>
                    )}
                    {!selectedGeneration && (
                      <p className="text-sm text-gray-400 mt-2">
                        Language: {language}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(selectedGeneration?.code || generatedCode || '', selectedGeneration?.id || 'current')}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600/50 to-blue-600/50 hover:from-cyan-600/70 hover:to-blue-600/70 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md shadow-cyan-500/10 hover:shadow-lg hover:scale-105"
                  >
                    {copiedId === (selectedGeneration?.id || 'current') ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border-2 border-gray-900 shadow-inner">
                  <SyntaxHighlighter
                    language={getLanguageAlias(selectedGeneration?.language || language)}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, borderRadius: '0.75rem', padding: '1.5rem', background: '#1e1e1e' }}
                  >
                    {selectedGeneration?.code || generatedCode || ''}
                  </SyntaxHighlighter>
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                    {selectedGeneration?.language || language}
                  </span>
                  {selectedGeneration && (
                    <>
                      <span>•</span>
                      <span>{new Date(selectedGeneration.createdAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
