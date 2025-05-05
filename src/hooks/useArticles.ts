import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import { useAuth } from '@/providers/AuthProvider';

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

interface ArticleStats {
  articles_read: number;
  articles_completed: number;
  total_xp_earned: number;
  date: string;
}

export function useArticles() {
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [dailyStats, setDailyStats] = useState<ArticleStats | null>(null);
  
  // Fetch articles with optional filtering
  const fetchArticles = useCallback(async (
    limit: number = 10, 
    offset: number = 0, 
    tag: string | null = null
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      // Construct the URL with query parameters
      let url = `/api/articles?limit=${limit}&offset=${offset}`;
      if (tag) {
        url += `&tag=${encodeURIComponent(tag)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data: ArticlesResponse = await response.json();
      
      setArticles(data.articles || []);
      setTotalCount(data.total_count);
      
      return data;
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to fetch articles');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Fetch a single article by slug
  const fetchArticleBySlug = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/articles/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to fetch article');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Track article reading progress
  const trackReadingProgress = useCallback(async (
    articleId: string, 
    readPercentage: number
  ) => {
    if (!authState.isAuthenticated) {
      console.warn('User not authenticated, cannot track reading progress');
      return null;
    }
    
    try {
      const response = await fetch('/api/articles/track-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId,
          readPercentage,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update reading progress');
      }
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error tracking reading progress:', err);
      return null;
    }
  }, [authState.isAuthenticated]);
  
  // Fetch daily article reading stats
  const fetchDailyStats = useCallback(async () => {
    if (!authState.isAuthenticated || !authState.warrior) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.rpc('get_warrior_daily_article_stats', {
        p_warrior_id: authState.warrior.id
      });
      
      if (error) throw error;
      
      setDailyStats(data as ArticleStats);
      return data as ArticleStats;
    } catch (err) {
      console.error('Error fetching daily article stats:', err);
      return null;
    }
  }, [supabase, authState.isAuthenticated, authState.warrior]);
  
  // Fetch daily stats on mount if authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.warrior) {
      fetchDailyStats();
    }
  }, [authState.isAuthenticated, authState.warrior, fetchDailyStats]);
  
  return {
    articles,
    loading,
    error,
    totalCount,
    dailyStats,
    fetchArticles,
    fetchArticleBySlug,
    trackReadingProgress,
    fetchDailyStats
  };
}
