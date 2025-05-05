'use client';

import React, { useState, useEffect } from 'react';
import { Book, Clock, Tag, Search, Filter, ChevronRight, ChevronLeft, Eye, CheckCircle, BookOpen, Zap, X, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';

interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  author: string;
  published_at: string;
  reading_time_minutes: number;
  banner_url: string;
  tags: string[];
  read_status: 'unread' | 'in_progress' | 'completed';
  read_percentage: number;
}

interface ArticlesResponse {
  articles: Article[];
  total_count: number;
  limit: number;
  offset: number;
}

export default function LearnPage() {
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationAnimation, setNotificationAnimation] = useState('animate-slide-in');
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      
      // Construct the URL with query parameters
      let url = `/api/articles?limit=${limit}&offset=${offset}`;
      if (selectedTag) {
        url += `&tag=${encodeURIComponent(selectedTag)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data: ArticlesResponse = await response.json();
      
      // Filter articles based on search query if provided
      let filteredArticles = data.articles || [];
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredArticles = filteredArticles.filter(article => 
          article.title.toLowerCase().includes(query) || 
          article.summary.toLowerCase().includes(query) ||
          article.author.toLowerCase().includes(query) ||
          article.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Filter articles based on read status if selected
      if (filterStatus) {
        filteredArticles = filteredArticles.filter(article => 
          article.read_status === filterStatus
        );
      }
      
      setArticles(filteredArticles);
      setTotalCount(data.total_count);
      
      // Extract all unique tags from articles
      if (data.articles) {
        const tags = data.articles.flatMap(article => article.tags);
        const uniqueTags = [...new Set(tags)];
        setAllTags(uniqueTags);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchArticles();
  }, [currentPage, selectedTag, filterStatus]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };
  
  // Handle pagination
  const totalPages = Math.ceil(totalCount / limit);
  
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Get status icon based on read status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <BookOpen className="w-5 h-5 text-yellow-500" />;
      default:
        return <Eye className="w-5 h-5 text-gray-400" />;
    }
  };
  
  // Randomly decide whether to show the notification
  useEffect(() => {
    if (authState.isAuthenticated) {
      // Generate a random number between 0 and 1
      const randomValue = Math.random();
      
      // Show notification with 40% probability
      // In a real app, you might want to store the last time it was shown in localStorage
      // to avoid showing it too frequently
      if (randomValue < 0.4) {
        // Add a small delay before showing the notification
        const randomDelay = Math.floor(Math.random() * 5000) + 1000; // Random delay between 1-6 seconds
        setTimeout(() => {
          setShowNotification(true);
        }, randomDelay);
      }
    }
  }, [authState.isAuthenticated]);
  
  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        setNotificationAnimation('animate-slide-out');
        setTimeout(() => setShowNotification(false), 500); // Wait for animation to complete
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showNotification]);
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotificationAnimation('animate-slide-out');
    setTimeout(() => setShowNotification(false), 500); // Wait for animation to complete
  };
  
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Daily Challenge Notification - Android Style */}
        {authState.isAuthenticated && showNotification && (
          <div className={`fixed right-0 top-20 z-50 ${notificationAnimation}`}>
            <div className="bg-slate-800 border-l-4 border-purple-500 shadow-lg p-4 m-4 rounded-l-lg max-w-xs relative">
              <button 
                onClick={handleCloseNotification}
                className="absolute top-2 right-2 text-slate-400 hover:text-white"
                aria-label="Close notification"
              >
                <X size={16} />
              </button>
              <h3 className="text-white font-bold flex items-center">
                <Zap className="mr-2 text-yellow-400" size={18} />
                Daily Challenge
              </h3>
              <p className="text-slate-300 text-sm mt-1">
                Read 4 articles today to earn 100 XP bonus!
              </p>
              <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full" 
                  style={{ width: '75%' }}
                ></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">3/4 completed</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-16 mb-8">
          <h1 className="text-2xl font-bold text-white">Learn</h1>
        </div>
        
        {/* Search and Filters */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-purple-500/20 text-slate-200 focus:outline-none focus:border-purple-500/50"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            </div>
            <button
              type="submit"
              className="px-4 py-2 neon-button-red rounded-lg text-white"
            >
              Search
            </button>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg flex items-center gap-2 hover:bg-slate-800/70 text-slate-300"
            >
              <Filter size={20} />
              Filters
              <ChevronDown size={16} className={showFilters ? 'rotate-180' : ''} />
            </button>
          </form>

          {showFilters && (
            <div className="mb-6 p-4 bg-slate-800/50 border border-purple-500/20 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-300">Topic</label>
                  <select
                    value={selectedTag || ''}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                  >
                    <option value="">All Topics</option>
                    {allTags.map((tag) => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
                {authState.isAuthenticated && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Read Status</label>
                    <select
                      value={filterStatus || ''}
                      onChange={(e) => setFilterStatus(e.target.value || null)}
                      className="w-full p-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-200"
                    >
                      <option value="">All Status</option>
                      <option value="unread">Unread</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Articles Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <BitcoinLoader />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20">
            <Book className="mx-auto w-12 h-12 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Articles Found</h3>
            <p className="text-slate-400">
              {searchQuery || selectedTag || filterStatus
                ? 'Try adjusting your search or filters'
                : 'Check back soon for new content'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/learn/${article.slug}`}
                className="bg-slate-800/50 border border-purple-500/20 rounded-lg overflow-hidden hover:border-purple-500/40 transition-all"
              >
                <div className="relative h-48">
                  <div className="w-full h-full relative">
                    <Image
                      src={article.banner_url || '/images/default-article.jpg'}
                      alt={article.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                    <h3 className="text-white font-bold text-lg">{article.title}</h3>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock size={14} />
                      <span className="text-sm">{article.reading_time_minutes} min read</span>
                    </div>
                  </div>
                  {article.read_status !== 'unread' && (
                    <div className="absolute top-2 right-2 bg-slate-900/80 rounded-full p-1">
                      {getStatusIcon(article.read_status)}
                    </div>
                  )}
                  {article.read_status === 'in_progress' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                      <div 
                        className="h-1 bg-gradient-to-r from-purple-500 to-blue-500" 
                        style={{ width: `${article.read_percentage}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                
                <div className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <Book size={16} className="text-purple-400" />
                      <span className="text-slate-300 text-sm">By {article.author}</span>
                    </div>
                    <div className="text-slate-400 text-sm">
                      {formatDate(article.published_at)}
                    </div>
                  </div>
                  
                  <p className="text-slate-400 text-sm mb-3 line-clamp-3">
                    {article.summary}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span 
                        key={tag} 
                        className="text-xs bg-slate-800/70 border border-purple-500/20 text-slate-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs bg-slate-800/70 border border-purple-500/20 text-slate-300 px-2 py-1 rounded">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>
                  
                  <button className="w-full py-2 bg-slate-800/70 border border-purple-500/20 rounded-lg hover:bg-slate-800/90 text-slate-300 flex items-center justify-center gap-2">
                    Read Article <ChevronRight size={16} />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {!loading && articles.length > 0 && totalPages > 1 && (
          <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-purple-500/20 text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="px-4 py-2 bg-slate-800/50 border border-purple-500/20 rounded-lg text-slate-300">
                Page {currentPage} of {totalPages}
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? 'bg-slate-800/30 border-slate-700/30 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/50 border-purple-500/20 text-slate-300 hover:bg-slate-800/70'
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
