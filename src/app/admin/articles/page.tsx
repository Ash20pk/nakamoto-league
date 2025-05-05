'use client';

import React, { useState, useEffect } from 'react';
import { Book, Plus, Edit, Trash2, Search, Filter, ChevronRight, ChevronLeft, Eye, CheckCircle, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
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
}

interface ArticlesResponse {
  articles: Article[];
  total_count: number;
  limit: number;
  offset: number;
}

export default function AdminArticlesPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Check if user is admin
  const checkAdminStatus = async () => {
    try {
      // Check admin authentication status using the auth API
      const response = await fetch('/api/admin/auth');
      const data = await response.json();
      
      if (!data.authenticated) {
        router.push('/admin/login');
        return false;
      }
      
      setIsAdmin(true);
      return true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/admin/login');
      return false;
    }
  };
  
  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * limit;
      
      // Use the dedicated admin API endpoint
      const response = await fetch(`/api/admin/articles?limit=${limit}&offset=${offset}&search=${encodeURIComponent(searchQuery)}&tag=${encodeURIComponent(selectedTag || '')}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      setArticles(data.articles || []);
      setTotalCount(data.total_count || 0);
      setAllTags(data.all_tags || []);
    } catch (error) {
      console.error('Error in fetchArticles:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete article
  const deleteArticle = async (id: string) => {
    try {
      const response = await fetch('/api/admin/articles', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ articleId: id }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Remove the deleted article from the state
      setArticles(articles.filter(article => article.id !== id));
      setDeleteConfirmation(null);
      
      // Show success message
      alert('Article deleted successfully');
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Failed to delete article');
    }
  };
  
  useEffect(() => {
    const init = async () => {
      const isAdminUser = await checkAdminStatus();
      if (isAdminUser) {
        fetchArticles();
      }
    };
    
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, selectedTag]);
  
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
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <BitcoinLoader />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              <Book className="inline-block mr-2 text-cyan" />
              Manage Articles
            </h1>
            <p className="text-gray-400">
              Create, edit, and delete articles for the Learn section
            </p>
          </div>
          
          <Link
            href="/admin/articles/create"
            className="mt-4 md:mt-0 bg-cyan hover:bg-cyan-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Article
          </Link>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-lg p-4 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pl-10 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                />
                <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                <button
                  type="submit"
                  className="absolute right-3 top-2 text-cyan hover:text-cyan-light"
                >
                  Search
                </button>
              </div>
            </form>
            
            <div className="relative">
              <select
                value={selectedTag || ''}
                onChange={(e) => setSelectedTag(e.target.value || null)}
                className="appearance-none bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pl-10 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
              >
                <option value="">All Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
              <Filter className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
              <ChevronRight className="absolute right-3 top-2.5 text-gray-400 w-4 h-4 transform rotate-90" />
            </div>
          </div>
        </div>
        
        {/* Articles Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <BitcoinLoader />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-lg">
            <Book className="mx-auto w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Articles Found</h3>
            <p className="text-gray-400">
              {searchQuery || selectedTag
                ? 'Try adjusting your search or filters'
                : 'Create your first article to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-700">
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Author</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Published</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Tags</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.id} className="border-t border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded overflow-hidden mr-3 hidden sm:block">
                          <Image
                            src={article.banner_url || '/images/default-article.jpg'}
                            alt={article.title}
                            width={40}
                            height={40}
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <div className="font-medium text-white">{article.title}</div>
                          <div className="text-sm text-gray-400 truncate max-w-xs">
                            {article.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {article.author}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {formatDate(article.published_at)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {article.tags && article.tags.slice(0, 2).map((tag) => (
                          <span 
                            key={tag} 
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {article.tags && article.tags.length > 2 && (
                          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                            +{article.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          href={`/learn/${article.slug}`}
                          target="_blank"
                          className="text-gray-400 hover:text-white"
                          title="View"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <Link
                          href={`/admin/articles/edit/${article.id}`}
                          className="text-gray-400 hover:text-cyan"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => setDeleteConfirmation(article.id)}
                          className="text-gray-400 hover:text-red"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && articles.length > 0 && (
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md ${
                  currentPage === totalPages
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Deletion</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this article? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteArticle(deleteConfirmation)}
                className="px-4 py-2 bg-red text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
