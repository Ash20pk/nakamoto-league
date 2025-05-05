'use client';

import React, { useState, useEffect } from 'react';
import { Book, Save, X, Upload, Tag, Plus, Trash2, ArrowLeft, ChevronLeft, ChevronRight, Eye, Settings, Image as ImageIcon, Maximize, Minimize } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import BitcoinLoader from '@/components/BitcoinLoader';
import TipTapEditor from '@/components/TipTapEditor';
import MarkdownPreview from '@/components/MarkdownPreview';
import './page.css';

export default function CreateArticlePage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  
  // Article data
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
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);
  const [editorFocused, setEditorFocused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
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
    setSlug(generateSlug(newTitle));
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
    setReadingTime(calculateReadingTime());
  }, [content]);
  
  // Toggle settings panel
  const toggleSettings = () => {
    setSettingsExpanded(!settingsExpanded);
  };
  
  // Toggle preview panel
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };
  
  // Handle editor focus
  const handleEditorFocus = () => {
    setEditorFocused(true);
    if (settingsExpanded) {
      setSettingsExpanded(false);
    }
    setIsFullScreen(true);
    setShowPreview(true);
  };
  
  // Handle exit focus mode (also exit fullscreen and hide preview)
  const handleExitFocusMode = () => {
    setIsFullScreen(false);
    setShowPreview(false);
  };
  
  // Create article
  const createArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content || !author) {
      setError('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Prepare banner image as base64 if provided
      let bannerImageBase64 = null;
      if (bannerImage) {
        const reader = new FileReader();
        bannerImageBase64 = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(bannerImage);
        });
      }
      
      // Send data to API
      const response = await fetch('/api/admin/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          summary,
          author,
          reading_time_minutes: readingTime,
          tags,
          banner_image_base64: bannerImageBase64
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create article');
      }
      
      const data = await response.json();
      
      setSuccess(true);
      
      // Redirect to articles list after a short delay
      setTimeout(() => {
        router.push('/admin/articles');
      }, 2000);
    } catch (error) {
      console.error('Error creating article:', error);
      setError(typeof error === 'object' && error !== null && 'message' in error 
        ? (error as Error).message 
        : 'Failed to create article. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    checkAdminStatus();
  }, []);
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <BitcoinLoader />
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md text-center">
          <div className="text-cyan text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold mb-4">Article Created Successfully!</h2>
          <p className="text-gray-400 mb-6">Your article has been created and is now available.</p>
          <Link href="/admin/articles" className="bg-cyan hover:bg-cyan-600 text-white px-6 py-2 rounded-md inline-block">
            Return to Articles
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/admin/articles" className="text-gray-400 hover:text-white mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl font-semibold flex items-center">
                <Book className="w-5 h-5 text-cyan mr-2" />
                Create New Article
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={togglePreview}
                className={`flex items-center px-3 py-1.5 rounded ${
                  showPreview ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                Preview
              </button>
              <button
                type="button"
                onClick={toggleSettings}
                className={`flex items-center px-3 py-1.5 rounded ${
                  settingsExpanded ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 mr-1.5" />
                Settings
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className={`flex items-center px-3 py-1.5 rounded ${
                  isFullScreen ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {isFullScreen ? (
                  <Minimize className="w-4 h-4 mr-1.5" />
                ) : (
                  <Maximize className="w-4 h-4 mr-1.5" />
                )}
                Fullscreen
              </button>
              <button
                type="button"
                onClick={createArticle}
                disabled={loading}
                className="flex items-center bg-cyan hover:bg-cyan-600 text-white px-4 py-1.5 rounded"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1.5" />
                    Publish Article
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-white px-4 py-3 mt-4 mx-4 rounded relative" role="alert">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
          <button 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <div className={`flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)] ${isFullScreen ? 'fullscreen' : ''}`}>
          {/* Settings Panel */}
          <div 
            className={`bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 ease-in-out ${
              settingsExpanded ? 'w-full md:w-1/4' : 'w-12'
            }`}
          >
            {!settingsExpanded ? (
              <button 
                onClick={toggleSettings}
                className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-6 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold">Article Settings</h2>
                  <button 
                    onClick={toggleSettings}
                    className="text-gray-400 hover:text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={handleTitleChange}
                      className="w-full bg-black border border-gray-700 rounded-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan"
                      placeholder="Enter article title"
                      required
                    />
                  </div>
                  
                  {/* Slug */}
                  <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-gray-400 mb-1">
                      Slug *
                    </label>
                    <input
                      type="text"
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan"
                      placeholder="article-url-slug"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      URL-friendly version of the title
                    </p>
                  </div>
                  
                  {/* Author */}
                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-400 mb-1">
                      Author *
                    </label>
                    <input
                      type="text"
                      id="author"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full bg-black border border-gray-700 rounded-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan"
                      placeholder="Author name"
                      required
                    />
                  </div>
                  
                  {/* Summary */}
                  <div>
                    <label htmlFor="summary" className="block text-sm font-medium text-gray-400 mb-1">
                      Summary
                    </label>
                    <textarea
                      id="summary"
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      rows={3}
                      className="w-full bg-black border border-gray-700 rounded-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan resize-none"
                      placeholder="Brief summary of the article"
                    />
                  </div>
                  
                  {/* Reading Time */}
                  <div>
                    <label htmlFor="readingTime" className="block text-sm font-medium text-gray-400 mb-1">
                      Reading Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="readingTime"
                      value={readingTime}
                      onChange={(e) => setReadingTime(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full bg-black border border-gray-700 rounded-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Auto-calculated based on content length
                    </p>
                  </div>
                  
                  {/* Banner Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Banner Image
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-700 border-dashed rounded-md">
                      {bannerPreview ? (
                        <div className="space-y-2 text-center">
                          <div className="relative w-full h-32">
                            <Image
                              src={bannerPreview}
                              alt="Banner preview"
                              layout="fill"
                              objectFit="cover"
                              className="rounded"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setBannerImage(null);
                              setBannerPreview(null);
                            }}
                            className="text-red-500 hover:text-red-400 text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1 text-center">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-500"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <div className="flex text-sm text-gray-500">
                            <label
                              htmlFor="banner-upload"
                              className="relative cursor-pointer bg-gray-800 rounded-md font-medium text-cyan hover:text-cyan-500 focus-within:outline-none"
                            >
                              <span className="px-3 py-2 block">Upload a file</span>
                              <input
                                id="banner-upload"
                                name="banner-upload"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleBannerChange}
                              />
                            </label>
                            <p className="pl-1 pt-2">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Tags */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-400 mb-1">
                      Tags
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        id="tags"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="flex-1 bg-black border border-gray-700 rounded-l-md px-4 py-2 text-white focus:ring-cyan focus:border-cyan"
                        placeholder="Add a tag"
                      />
                      <button
                        type="button"
                        onClick={addTag}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-r-md"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <div
                            key={tag}
                            className="bg-gray-800 text-white text-sm px-3 py-1 rounded-full flex items-center"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(tag)}
                              className="ml-1.5 text-gray-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Content Editor and Preview */}
          <div className={`flex-1 flex flex-col md:flex-row gap-6 h-full ${isFullScreen ? 'fullscreen-content' : ''}`}>
            {/* Content Editor */}
            <div className={`bg-gray-900 rounded-lg h-full overflow-hidden ${isFullScreen && showPreview ? 'md:w-1/2' : 'w-full'}`}>
              <div className="p-6 h-full flex flex-col">
                <h2 className="text-lg font-semibold mb-4">Content</h2>
                <div className="flex-1 overflow-hidden">
                  <TipTapEditor 
                    initialValue={content} 
                    onChange={setContent} 
                    onFocus={handleEditorFocus}
                    onFullScreenChange={setIsFullScreen}
                    showPreview={isFullScreen && showPreview}
                    title={title}
                    author={author}
                    bannerUrl={bannerPreview}
                    isFullScreen={isFullScreen}
                    onExitFocusMode={handleExitFocusMode}
                  />
                </div>
              </div>
            </div>
            
            {/* Preview Panel - only show when in fullscreen mode */}
            {isFullScreen && showPreview && (
              <div className="md:w-1/2 bg-gray-900 rounded-lg h-full overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Preview</h2>
                    <button 
                      onClick={togglePreview}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <MarkdownPreview 
                      markdown={content} 
                      title={title} 
                      author={author} 
                      readingTime={readingTime}
                      bannerUrl={bannerPreview}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
