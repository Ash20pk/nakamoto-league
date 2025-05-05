'use client';

import React, { useState, useEffect } from 'react';
import { Book, Save, X, Upload, Tag, Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import BitcoinLoader from '@/components/BitcoinLoader';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  author: string;
  published_at: string;
  reading_time_minutes: number;
  banner_url: string | null;
  tags: string[];
}

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params?.id as string;
  const supabase = createClientComponentClient<Database>();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [author, setAuthor] = useState('');
  const [readingTime, setReadingTime] = useState(5);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Check if user is admin
  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/admin/login');
        return false;
      }
      
      // Check if user is in admin_users table
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
        
      if (error || !adminUser) {
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
  
  // Fetch article data
  const fetchArticle = async () => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        router.push('/admin/articles');
        return;
      }
      
      setArticle(data as Article);
      setTitle(data.title);
      setSlug(data.slug);
      setContent(data.content);
      setSummary(data.summary || '');
      setAuthor(data.author);
      setReadingTime(data.reading_time_minutes);
      setTags(data.tags || []);
      
      if (data.banner_url) {
        setBannerPreview(data.banner_url);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setError('Failed to load article data');
    } finally {
      setLoading(false);
    }
  };
  
  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  };
  
  // Handle title change and auto-generate slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Only auto-generate slug if it hasn't been manually edited or matches the previous auto-generated slug
    if (slug === generateSlug(title)) {
      setSlug(generateSlug(newTitle));
    }
  };
  
  // Handle banner image upload
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBannerImage(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Add tag
  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle tag input keydown
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  // Calculate reading time based on content length
  const calculateReadingTime = () => {
    // Average reading speed: 200 words per minute
    const wordCount = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / 200);
    return Math.max(1, minutes); // Minimum 1 minute
  };
  
  // Update reading time when content changes
  useEffect(() => {
    if (!loading) {
      setReadingTime(calculateReadingTime());
    }
  }, [content, loading]);
  
  // Update article
  const updateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content || !author) {
      setError('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Upload banner image if a new one was provided
      let bannerUrl = article?.banner_url || null;
      if (bannerImage) {
        const fileExt = bannerImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `articles/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('public')
          .upload(filePath, bannerImage);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('public')
          .getPublicUrl(filePath);
          
        bannerUrl = publicUrlData.publicUrl;
      }
      
      // Update article record
      const { data, error } = await supabase
        .from('articles')
        .update({
          title,
          slug,
          content,
          summary,
          author,
          reading_time_minutes: readingTime,
          banner_url: bannerUrl,
          tags,
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId)
        .select()
        .single();
        
      if (error) throw error;
      
      setSuccess(true);
      
      // Redirect to articles list after a short delay
      setTimeout(() => {
        router.push('/admin/articles');
      }, 2000);
    } catch (error) {
      console.error('Error updating article:', error);
      setError('Failed to update article. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  useEffect(() => {
    const init = async () => {
      const isAdminUser = await checkAdminStatus();
      if (isAdminUser) {
        fetchArticle();
      }
    };
    
    init();
  }, [articleId]);
  
  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <BitcoinLoader />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Link href="/admin/articles" className="text-gray-400 hover:text-white mr-4">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white">
            <Book className="inline-block mr-2 text-cyan" />
            Edit Article
          </h1>
        </div>
        
        {error && (
          <div className="bg-red-900/50 border border-red-800 text-white px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-900/50 border border-green-800 text-white px-4 py-3 rounded-md mb-6">
            Article updated successfully! Redirecting...
          </div>
        )}
        
        <form onSubmit={updateArticle} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column - Basic info */}
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-white font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="slug" className="block text-white font-medium mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                  required
                />
                <p className="text-gray-400 text-sm mt-1">
                  URL-friendly version of the title
                </p>
              </div>
              
              <div>
                <label htmlFor="author" className="block text-white font-medium mb-2">
                  Author *
                </label>
                <input
                  type="text"
                  id="author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="summary" className="block text-white font-medium mb-2">
                  Summary
                </label>
                <textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Brief description of the article (shown in listings)
                </p>
              </div>
              
              <div>
                <label htmlFor="reading-time" className="block text-white font-medium mb-2">
                  Reading Time (minutes)
                </label>
                <input
                  type="number"
                  id="reading-time"
                  value={readingTime}
                  onChange={(e) => setReadingTime(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Auto-calculated based on content length
                </p>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <div 
                      key={tag} 
                      className="bg-gray-700 text-white px-3 py-1 rounded-md flex items-center"
                    >
                      <span>{tag}</span>
                      <button 
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-gray-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Add a tag"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-r-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">
                  Banner Image
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                  {bannerPreview ? (
                    <div className="relative">
                      <Image
                        src={bannerPreview}
                        alt="Banner preview"
                        width={400}
                        height={200}
                        className="mx-auto rounded-lg object-cover h-48 w-full"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBannerImage(null);
                          setBannerPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-gray-900/80 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="py-8">
                      <Upload className="mx-auto w-12 h-12 text-gray-500 mb-2" />
                      <p className="text-gray-400">
                        Drag and drop an image or click to browse
                      </p>
                      <input
                        type="file"
                        id="banner"
                        onChange={handleBannerChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('banner')?.click()}
                        className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                      >
                        Select Image
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Right column - Content */}
            <div>
              <label htmlFor="content" className="block text-white font-medium mb-2">
                Content (Markdown) *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={25}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan"
                required
              />
              <p className="text-gray-400 text-sm mt-1">
                Write content using Markdown format
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Link
              href="/admin/articles"
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 mr-3"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-cyan hover:bg-cyan-600 text-white rounded-md flex items-center"
            >
              {saving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Article
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
