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

const getLanguageColor = (lang: string, isDark: boolean = true): string => {
  if (isDark) {
    return 'border-[#2A2F34]';
  } else {
    return 'bg-blue-100 text-blue-800 border-blue-300';
  }
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
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ background: 'linear-gradient(145deg, #6B7280, #737A85)' }}
    >
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8 text-center relative">
          <h1 className="text-5xl font-bold mb-3 text-white">
            Code Generation Copilot
          </h1>
          <p className="text-lg text-slate-300">
            Generate code using AI from natural language prompts
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Corner: History */}
          <div className="lg:col-span-3">
            <div 
              className="rounded-xl border border-[#4A4D52] p-4 sticky top-4"
              style={{ backgroundColor: '#4A5058', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
            >
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#22C55E' }}
                ></span>
                History
              </h2>

              {/* New Chat Button - Always visible at top */}
              <button
                onClick={() => {
                  setSelectedGeneration(null);
                  setGeneratedCode(null);
                  setPrompt('');
                }}
                className={`w-full text-left p-3 rounded-lg border border-[#4A4D52] transition-all duration-200 mb-4 ${
                  !selectedGeneration && !generatedCode
                    ? 'border-[#4F87FF]'
                    : 'hover:bg-[#3A3C40]'
                }`}
                style={!selectedGeneration && !generatedCode ? { backgroundColor: '#4A5563' } : {}}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">➕</span>
                  <span className="text-sm font-semibold text-white">New Chat</span>
                </div>
                <p className="text-xs mt-1 text-slate-400">Generate new code</p>
              </button>

              {isLoadingHistory ? (
                <div className="text-center py-8 text-slate-400">
                  <div 
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto"
                    style={{ borderColor: '#4F87FF' }}
                  ></div>
                  <p className="mt-2 text-sm">Loading...</p>
                </div>
              ) : historyError ? (
                <div className="bg-red-900/20 border-red-800 text-red-300 border px-4 py-3 rounded-lg text-sm">
                  {historyError}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
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
                            ? 'border-[#4F87FF]'
                            : 'border-[#4A4D52] hover:bg-[#3A3C40]'
                        }`}
                        style={{ backgroundColor: selectedGeneration?.id === gen.id ? '#3A3C40' : 'transparent' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span 
                                className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border border-[#2A2F34]"
                                style={{ color: '#93B4FF', backgroundColor: 'rgba(79, 135, 255, 0.1)', borderColor: '#4F87FF' }}
                              >
                                {gen.language}
                              </span>
                            </div>
                            <p className="text-xs font-semibold line-clamp-3 leading-relaxed text-white">
                              {gen.prompt}
                            </p>
                            <p 
                              className="text-[10px] mt-2"
                              style={{ color: '#94A3B8' }}
                            >
                              {new Date(gen.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div 
                      className="flex justify-between items-center pt-4 border-t"
                      style={{ borderColor: '#4A4D52' }}
                    >
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className={`px-3 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:shadow-none`}
                        style={{ 
                          backgroundColor: pagination.hasPrev ? '#5B6B7A' : '#3A3C40',
                        }}
                      >
                        Prev
                      </button>
                      <span 
                        className="text-xs font-medium"
                        style={{ color: '#94A3B8' }}
                      >
                        {pagination.page}/{pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className={`px-3 py-1.5 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-200 disabled:shadow-none`}
                        style={{ 
                          backgroundColor: pagination.hasNext ? '#5B6B7A' : '#3A3C40',
                        }}
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
            <div 
              className="rounded-xl border border-[#4A4D52] p-6"
              style={{ backgroundColor: '#778899', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
            >
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-white">
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: '#22C55E' }}
                ></span>
                Enter Your Prompt
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#E2E8F0' }}
                  >
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Write a Python function to reverse a string"
                    className="w-full px-4 py-3 border border-[#4A4D52] rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none transition-all duration-200 text-white placeholder-slate-400"
                    style={{ backgroundColor: '#3A3C40' }}
                    rows={4}
                  />
                </div>

                <div>
                  <label 
                    className="block text-sm font-semibold mb-2"
                    style={{ color: '#E2E8F0' }}
                  >
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-[#4A4D52] rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 cursor-pointer text-white"
                    style={{ backgroundColor: '#3A3C40' }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option 
                        key={lang} 
                        value={lang} 
                        className=""
                        style={{ backgroundColor: '#3A3C40', color: '#FFFFFF' }}
                      >
                        {lang}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                  style={{ 
                    backgroundColor: isGenerating ? '#3A3C40' : '#5B6B7A',
                    boxShadow: isGenerating ? 'none' : '0 4px 6px -1px rgba(91, 107, 122, 0.4)',
                  }}
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
                  <div className="bg-red-900/20 border-red-800 text-red-300 border-2 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Code Display - Show only selected history OR newly generated code */}
            {(selectedGeneration || generatedCode) && (
              <div 
                className="rounded-xl border border-[#4A4D52] p-6"
                style={{ backgroundColor: '#778899', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex-1">
                    {selectedGeneration ? (
                      <h2 className="text-xl font-bold mb-2" style={{ color: '#FFFFFF' }}>
                        {selectedGeneration.prompt}
                      </h2>
                    ) : (
                      <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: '#22C55E' }}
                        ></span>
                        Generated Code
                      </h2>
                    )}
                    {!selectedGeneration && (
                      <p 
                        className="text-sm mt-2"
                        style={{ color: '#CBD5E1' }}
                      >
                        Language: {language}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopy(selectedGeneration?.code || generatedCode || '', selectedGeneration?.id || 'current')}
                    className="px-4 py-2 hover:opacity-90 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
                    style={{ backgroundColor: '#5B6B7A' }}
                  >
                    {copiedId === (selectedGeneration?.id || 'current') ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
                <div 
                  className="rounded-xl overflow-hidden border shadow-inner"
                  style={{ borderColor: '#4A4D52' }}
                >
                  <SyntaxHighlighter
                    language={getLanguageAlias(selectedGeneration?.language || language)}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, borderRadius: '0.75rem', padding: '1.5rem', background: '#1e1e1e' }}
                  >
                    {selectedGeneration?.code || generatedCode || ''}
                  </SyntaxHighlighter>
                </div>
                <div 
                  className="mt-4 flex items-center gap-4 text-sm"
                  style={{ color: '#94A3B8' }}
                >
                  <span className="flex items-center gap-1">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#22C55E' }}
                    ></span>
                    {selectedGeneration?.language || language}
                  </span>
                  {selectedGeneration && (
                    <>
                      <span>•</span>
                      <span style={{ color: '#94A3B8' }}>{new Date(selectedGeneration.createdAt).toLocaleString()}</span>
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
