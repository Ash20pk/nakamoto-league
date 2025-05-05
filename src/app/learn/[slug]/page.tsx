'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Book, Clock, Tag, ArrowLeft, Eye, BookOpen, CheckCircle, Moon, Sun, ChevronUp, ChevronDown, Share2, Bookmark, BookmarkCheck, Volume2, VolumeX, ChevronRight, ChevronLeft, Focus, Info, X, Sword, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/lib/database.types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BitcoinLoader from '@/components/BitcoinLoader';
import ReactMarkdown from 'react-markdown';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  author: string;
  published_at: string;
  reading_time_minutes: number;
  banner_url: string;
  tags: string[];
  read_status: 'unread' | 'in_progress' | 'completed';
  read_percentage: number;
  xp_earned: number;
}

const KEYBOARD_SHORTCUTS = {
  toggleDarkMode: { key: 'd', description: 'Toggle dark/light mode' },
  increaseFontSize: { key: '+', description: 'Increase font size' },
  decreaseFontSize: { key: '-', description: 'Decrease font size' },
  toggleBookmark: { key: 'b', description: 'Toggle bookmark' },
  toggleSpeech: { key: 's', description: 'Toggle text-to-speech' },
  scrollToTop: { key: 't', description: 'Scroll to top' },
  toggleControls: { key: 'c', description: 'Toggle controls' },
  toggleFocusMode: { key: 'z', description: 'Toggle focus mode' },
  toggleShortcutsHelp: { key: '?', description: 'Toggle shortcuts help' },
  escape: { key: 'Escape', description: 'Exit focus mode' }
};

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { authState } = useAuth();
  const supabase = createClientComponentClient<Database>();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [readingProgress, setReadingProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(18);
  const [fullscreen, setFullscreen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);
  const [showXpNotification, setShowXpNotification] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [notificationsSnooze, setNotificationsSnooze] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  
  const contentRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTrackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const slug = params?.slug as string;
  
  // Format date to readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Fetch article
  const fetchArticle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/articles/${slug}`);
      if (!response.ok) {
        throw new Error('Failed to fetch article');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setArticle(data);
      setReadingProgress(data.read_percentage || 0);
    } catch (error) {
      console.error('Error fetching article:', error);
      router.push('/learn');
    } finally {
      setLoading(false);
    }
  };
  
  // Track reading progress
  const trackReadingProgress = () => {
    if (!contentRef.current || !article) return;
    
    const element = contentRef.current;
    const windowHeight = window.innerHeight;
    const fullHeight = element.scrollHeight;
    const visibleHeight = windowHeight;
    const scrollTop = window.scrollY;
    
    // Calculate how much of the article has been scrolled through
    const scrolled = Math.min(
      100,
      Math.ceil((scrollTop / (fullHeight - visibleHeight)) * 100)
    );
    
    // Only update if progress has increased
    if (scrolled > readingProgress) {
      setReadingProgress(scrolled);
      
      // Update progress in the database if authenticated and progress has changed significantly
      if (authState.isAuthenticated && article && scrolled % 5 === 0) {
        updateReadingProgress(scrolled);
      }
    }
  };
  
  // Update reading progress in the database
  const updateReadingProgress = async (progress: number) => {
    if (!authState.isAuthenticated || !article) return;
    
    try {
      const response = await fetch('/api/articles/track-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articleId: article.id,
          readPercentage: progress,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update reading progress');
      }
      
      const data = await response.json();
      
      // If XP was earned, show notification
      if (data.xp_earned > 0) {
        const newXpEarned = xpEarned + data.xp_earned;
        setXpEarned(newXpEarned);
        setShowXpNotification(true);
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setShowXpNotification(false);
        }, 3000);
      }
      
    } catch (error) {
      console.error('Error updating reading progress:', error);
    }
  };
  
  // Add haptic feedback
  const triggerHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10); // Short vibration (10ms)
    }
  };
  
  // Add haptic and sound feedback
  const triggerFeedback = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10); // Short vibration (10ms)
    }
    
    // Sound feedback
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => {
        // Silent catch - some browsers require user interaction before playing audio
        console.log("Audio couldn't play automatically:", e);
      });
    }
  };
  
  // Toggle dark mode with feedback
  const toggleDarkMode = () => {
    triggerFeedback();
    setDarkMode(!darkMode);
  };
  
  // Change font size with feedback
  const changeFontSize = (delta: number) => {
    triggerFeedback();
    setFontSize(Math.max(14, Math.min(24, fontSize + delta)));
  };
  
  // Toggle fullscreen mode with feedback
  const toggleFullscreen = () => {
    triggerFeedback();
    // This function is now only used internally by the focus mode
    if (!fullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      }
      setFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setFullscreen(false);
    }
  };
  
  // Toggle bookmark with feedback
  const toggleBookmark = () => {
    triggerFeedback();
    setIsBookmarked(!isBookmarked);
  };
  
  // Toggle text-to-speech with feedback
  const toggleSpeech = () => {
    triggerFeedback();
    if (!article) return;
    
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    
    // Create a new utterance if one doesn't exist
    if (!speechSynthesisRef.current) {
      // Strip markdown from content
      const textContent = article.content.replace(/#+\s/g, '').replace(/\*\*/g, '');
      
      const utterance = new SpeechSynthesisUtterance(textContent);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      speechSynthesisRef.current = utterance;
    }
    
    window.speechSynthesis.speak(speechSynthesisRef.current);
    setIsSpeaking(true);
  };
  
  // Toggle controls with feedback
  const toggleControls = () => {
    triggerFeedback();
    setShowControls(!showControls);
  };
  
  // Scroll to top with feedback
  const scrollToTop = () => {
    triggerFeedback();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Update current time
  const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setCurrentTime(`${hours}:${minutes}`);
  };
  
  // Toggle focus mode with feedback
  const toggleFocusMode = () => {
    triggerFeedback();
    
    // Using the callback form to ensure we have the latest state
    setFocusMode(prevFocusMode => {
      const newFocusMode = !prevFocusMode;
      
      if (newFocusMode) {
        // When entering focus mode, hide controls and snooze notifications
        setShowControls(false);
        setNotificationsSnooze(true);
        
        // Request fullscreen if not already in fullscreen mode
        if (!fullscreen) {
          toggleFullscreen();
        }
      } else {
        // When exiting focus mode, show controls and un-snooze notifications
        setShowControls(true);
        setNotificationsSnooze(false);
        
        // Exit fullscreen if in fullscreen mode
        if (fullscreen) {
          toggleFullscreen();
        }
      }
      return newFocusMode;
    });
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in a text field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Check for modifier keys based on OS
    const modifierKey = isMac ? e.metaKey : e.ctrlKey;

    // Handle shortcuts
    switch (e.key.toLowerCase()) {
      case KEYBOARD_SHORTCUTS.toggleDarkMode.key:
        if (modifierKey) toggleDarkMode();
        break;
      case KEYBOARD_SHORTCUTS.increaseFontSize.key:
      case '=': // Also support '=' key for increase (same key as '+' without shift)
        if (modifierKey) changeFontSize(2);
        break;
      case KEYBOARD_SHORTCUTS.decreaseFontSize.key:
        if (modifierKey) changeFontSize(-2);
        break;
      case KEYBOARD_SHORTCUTS.toggleBookmark.key:
        if (modifierKey) toggleBookmark();
        break;
      case KEYBOARD_SHORTCUTS.toggleSpeech.key:
        if (modifierKey) toggleSpeech();
        break;
      case KEYBOARD_SHORTCUTS.scrollToTop.key:
        if (modifierKey) scrollToTop();
        break;
      case KEYBOARD_SHORTCUTS.toggleControls.key:
        if (modifierKey) toggleControls();
        break;
      case KEYBOARD_SHORTCUTS.toggleFocusMode.key:
        if (modifierKey) toggleFocusMode();
        break;
      case KEYBOARD_SHORTCUTS.toggleShortcutsHelp.key:
        if (modifierKey || e.key === '?') setShowShortcutsHelp(!showShortcutsHelp);
        break;
      case KEYBOARD_SHORTCUTS.escape.key.toLowerCase():
        if (focusMode) toggleFocusMode();
        if (showShortcutsHelp) setShowShortcutsHelp(false);
        break;
    }
  };
  
  // Handle right click to show custom context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Show context menu anywhere on the screen
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY
    });
  };
  
  // Handle click outside to close context menu
  const handleClickOutside = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };
  
  // Cleanup function for speech synthesis and progress tracking
  const cleanup = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
    
    if (progressTrackingIntervalRef.current) {
      clearInterval(progressTrackingIntervalRef.current);
    }
  };
  
  // Initialize
  useEffect(() => {
    fetchArticle();
    
    // Set up scroll event listener for tracking reading progress
    window.addEventListener('scroll', trackReadingProgress);
    
    // Set up interval to periodically update reading progress
    progressTrackingIntervalRef.current = setInterval(() => {
      if (readingProgress > 0 && readingProgress % 25 === 0) {
        updateReadingProgress(readingProgress);
      }
    }, 30000); // Check every 30 seconds
    
    // Set up keyboard event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Set up click listener to close context menu
    window.addEventListener('click', handleClickOutside);
    
    // Detect OS
    setIsMac(navigator.userAgent.indexOf('Mac') !== -1);
    
    // Set up time updater
    updateCurrentTime();
    timeIntervalRef.current = setInterval(updateCurrentTime, 60000); // Update every minute
    
    // Create audio element for click sound
    audioRef.current = new Audio('/sounds/click.mp3');
    audioRef.current.volume = 0.2; // Set volume to 20%
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('scroll', trackReadingProgress);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      cleanup();
    };
  }, [slug]);
  
  // Update progress when component unmounts
  useEffect(() => {
    return () => {
      if (readingProgress > 0 && article) {
        updateReadingProgress(readingProgress);
      }
    };
  }, [readingProgress, article]);
  
  // Update dependencies for keyboard shortcuts
  useEffect(() => {
    // Re-add event listener when dependencies change
    window.removeEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    darkMode, fontSize, fullscreen, isBookmarked, 
    isSpeaking, showControls, focusMode, showShortcutsHelp
  ]);

  // Share article function
  const shareArticle = (platform: string) => {
    if (!article) return;
    
    const articleUrl = window.location.href;
    const articleTitle = article.title;
    
    switch (platform) {
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(articleTitle)}&url=${encodeURIComponent(articleUrl)}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(articleUrl)
          .then(() => {
            // Show a temporary notification
            const notification = document.createElement('div');
            notification.className = 'fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg z-50';
            notification.textContent = 'Link copied to clipboard!';
            document.body.appendChild(notification);
            
            // Remove notification after 2 seconds
            setTimeout(() => {
              document.body.removeChild(notification);
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy link: ', err);
          });
        break;
      default:
        break;
    }
    
    // Trigger haptic feedback
    triggerHapticFeedback();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Navbar />
        <div className="flex justify-center items-center h-[80vh]">
          <BitcoinLoader />
        </div>
      </div>
    );
  }
  
  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Article not found</h1>
          <Link href="/learn" className="text-cyan hover:underline">
            Return to articles
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-100'} transition-colors duration-300`}
      onContextMenu={handleContextMenu}
    >
      {!focusMode && <Navbar />}
      
      {/* Minimal header for focus mode with logo and time */}
      {focusMode && (
        <div className="fixed top-0 left-0 w-full bg-gradient-to-b from-gray-950/90 to-transparent backdrop-blur-sm z-[100] px-4 py-3 flex justify-between items-center transition-opacity duration-500 ease-in-out">
          <div className="w-1/3"></div> {/* Empty div for spacing */}
          
          <div className="w-1/3 flex justify-center items-center opacity-70 hover:opacity-100 transition-opacity duration-300">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Sword className="w-7 h-7 text-red group-hover:text-red-light transition-colors" />
                <Zap className="w-3 h-3 text-cyan absolute -top-1 -right-1 animate-pulse" />
                <div className="absolute -inset-1 bg-red/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-sans-jp leading-none">ナカモト・リーグ</span>
                <span className="text-sm font-bold font-serif-jp text-white group-hover:text-shadow-cyan transition-all">
                  NAKAMOTO LEAGUE
                </span>
              </div>
            </Link>
          </div>
          
          <div className="w-1/3 flex justify-end">
            <div className="text-cyan text-xl font-mono tracking-widest">
              {currentTime}
            </div>
          </div>
        </div>
      )}
      
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-50">
        <div 
          className="h-1 bg-cyan" 
          style={{ width: `${readingProgress}%` }}
        ></div>
      </div>
      
      {/* XP Notification */}
      {showXpNotification && !notificationsSnooze && (
        <div className="fixed top-16 right-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center">
            <span className="font-bold">+{xpEarned} XP</span>
            <span className="ml-2">earned!</span>
          </div>
        </div>
      )}
      
      {/* Keyboard shortcuts help */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Info className="w-5 h-5 mr-2 text-cyan" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-2">
              {Object.entries(KEYBOARD_SHORTCUTS).map(([action, { key, description }]) => (
                <div key={action} className="flex justify-between">
                  <span className="text-gray-300">{description}</span>
                  <kbd className="px-2 py-1 bg-gray-800 text-gray-300 rounded border border-gray-700 font-mono text-sm">
                    {isMac && key !== 'Escape' ? '⌘' : 'Ctrl+'}{key.toUpperCase()}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Reading controls */}
      <div 
        className={`fixed right-4 top-1/2 transform -translate-y-1/2 bg-gray-900/90 backdrop-blur-sm rounded-lg border border-gray-800 p-2 z-40 transition-opacity duration-300 ${
          showControls || !focusMode ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="flex flex-col items-center space-y-4">
          <button 
            onClick={toggleControls}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
            title={showControls ? "Hide controls" : "Show controls"}
          >
            {showControls ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          
          <div className={`space-y-4 ${showControls ? 'block' : 'hidden'}`}>
            <button 
              onClick={toggleDarkMode}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`${darkMode ? "Light mode" : "Dark mode"} (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.toggleDarkMode.key.toUpperCase()})`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={() => changeFontSize(2)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`Increase font size (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.increaseFontSize.key})`}
            >
              <span className="text-lg font-bold">A+</span>
            </button>
            
            <button 
              onClick={() => changeFontSize(-2)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`Decrease font size (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.decreaseFontSize.key})`}
            >
              <span className="text-sm font-bold">A-</span>
            </button>
            
            <button 
              onClick={toggleFocusMode}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`${focusMode ? "Exit focus mode" : "Enter focus mode"} (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.toggleFocusMode.key.toUpperCase()})`}
            >
              <Focus className={`w-5 h-5 ${focusMode ? 'text-cyan' : ''}`} />
            </button>
            
            <button 
              onClick={toggleBookmark}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`${isBookmarked ? "Remove bookmark" : "Bookmark this article"} (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.toggleBookmark.key.toUpperCase()})`}
            >
              {isBookmarked ? <BookmarkCheck className="w-5 h-5 text-cyan" /> : <Bookmark className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={toggleSpeech}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`${isSpeaking ? "Stop reading" : "Read aloud"} (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.toggleSpeech.key.toUpperCase()})`}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5 text-cyan" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={scrollToTop}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`Scroll to top (${isMac ? '⌘' : 'Ctrl+'}${KEYBOARD_SHORTCUTS.scrollToTop.key.toUpperCase()})`}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => setShowShortcutsHelp(true)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
              title={`Keyboard shortcuts (${isMac ? '⌘' : 'Ctrl+'}?)`}
            >
              <span className="font-bold">?</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Custom right-click context menu */}
      {contextMenu.visible && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{ 
            left: `${contextMenu.x}px`, 
            top: `${contextMenu.y}px`,
          }}
        >
          {/* Background overlay */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={() => setContextMenu({ ...contextMenu, visible: false })}></div>
          
          {/* Menu container */}
          <div className="absolute w-[300px] bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-700 shadow-xl transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto overflow-hidden">
            
            {/* Menu grid */}
            <div className="p-4 grid grid-cols-3 gap-4">
              {/* Dark/Light Mode */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    toggleDarkMode();
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  {darkMode ? 
                    <Sun className="w-6 h-6 text-yellow-400" /> : 
                    <Moon className="w-6 h-6 text-blue-400" />
                  }
                </button>
                <span className="text-xs text-gray-300">{darkMode ? 'Light' : 'Dark'}</span>
              </div>
              
              {/* Font Size Increase */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    changeFontSize(2);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <span className="text-lg font-bold text-gray-300">A+</span>
                </button>
                <span className="text-xs text-gray-300">Larger</span>
              </div>
              
              {/* Font Size Decrease */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    changeFontSize(-2);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <span className="text-sm font-bold text-gray-300">A-</span>
                </button>
                <span className="text-xs text-gray-300">Smaller</span>
              </div>
              
              {/* Focus Mode */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    toggleFocusMode();
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <Focus className={`w-6 h-6 ${focusMode ? 'text-cyan' : 'text-gray-300'}`} />
                </button>
                <span className="text-xs text-gray-300">{focusMode ? 'Exit' : 'Focus'}</span>
              </div>
              
              {/* Bookmark */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    toggleBookmark();
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  {isBookmarked ? 
                    <BookmarkCheck className="w-6 h-6 text-cyan" /> : 
                    <Bookmark className="w-6 h-6 text-gray-300" />
                  }
                </button>
                <span className="text-xs text-gray-300">{isBookmarked ? 'Saved' : 'Save'}</span>
              </div>
              
              {/* Text-to-Speech */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    toggleSpeech();
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  {isSpeaking ? 
                    <VolumeX className="w-6 h-6 text-cyan" /> : 
                    <Volume2 className="w-6 h-6 text-gray-300" />
                  }
                </button>
                <span className="text-xs text-gray-300">{isSpeaking ? 'Stop' : 'Read'}</span>
              </div>
              
              {/* Scroll to Top */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    scrollToTop();
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <ChevronUp className="w-6 h-6 text-gray-300" />
                </button>
                <span className="text-xs text-gray-300">Top</span>
              </div>
              
              {/* Help */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    setShowShortcutsHelp(true);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <Info className="w-6 h-6 text-gray-300" />
                </button>
                <span className="text-xs text-gray-300">Help</span>
              </div>
              
              {/* Close */}
              <div className="flex flex-col items-center">
                <button 
                  onClick={() => {
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                  className="w-14 h-14 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition-colors mb-1"
                >
                  <X className="w-6 h-6 text-gray-300" />
                </button>
                <span className="text-xs text-gray-300">Close</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={`container mx-auto px-4 py-8 ${focusMode ? 'pt-16' : 'pt-24'} transition-all duration-300 ${
        focusMode ? 'max-w-2xl' : ''
      }`}>
        {/* Back button */}
        {!focusMode && (
          <div className="mb-6">
            <Link 
              href="/learn" 
              className={`inline-flex items-center ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Articles
            </Link>
          </div>
        )}
        
        {/* Article header */}
        <div className={`max-w-4xl mx-auto mb-8 ${focusMode ? 'sr-only' : ''}`}>
          <div className="flex items-center mb-4 space-x-2">
            {article.tags.slice(0, 3).map((tag) => (
              <span 
                key={tag} 
                className={`text-xs px-2 py-1 rounded ${
                  darkMode 
                    ? 'bg-gray-800 text-gray-300' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {article.title}
          </h1>
          
          <div className={`flex items-center mb-6 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span>By {article.author}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(article.published_at)}</span>
            <span className="mx-2">•</span>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{article.reading_time_minutes} min read</span>
            </div>
          </div>
          
          {/* Reading status */}
          {authState.isAuthenticated && (
            <div className="mb-6 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {article.read_status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  ) : article.read_status === 'in_progress' ? (
                    <BookOpen className="w-5 h-5 text-yellow-500 mr-2" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-400 mr-2" />
                  )}
                  <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                    {article.read_status === 'completed' 
                      ? 'Completed' 
                      : article.read_status === 'in_progress' 
                        ? 'In Progress' 
                        : 'Not Started'}
                  </span>
                </div>
                <div className="text-sm text-purple-500 font-medium">
                  {article.xp_earned > 0 ? `${article.xp_earned} XP earned` : ''}
                </div>
              </div>
              
              <div className="w-full h-2 rounded-full bg-gray-800">
                <div 
                  className={`h-2 rounded-full ${
                    article.read_status === 'completed' 
                      ? 'bg-green-500' 
                      : 'bg-purple-500'
                  }`}
                  style={{ width: `${readingProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Featured image */}
          <div className="relative w-full h-64 md:h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={article.banner_url || '/images/default-article.jpg'}
              alt={article.title}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
        
        {/* Article content */}
        <div 
          ref={contentRef}
          className={`max-w-3xl mx-auto article-content ${
            darkMode ? 'text-gray-200' : 'text-gray-800'
          } ${focusMode ? 'leading-relaxed' : ''}`}
          style={{ fontSize: `${fontSize}px` }}
        >
          <ReactMarkdown>{article.content}</ReactMarkdown>
        </div>
        
        {/* Article footer */}
        <div className={`max-w-3xl mx-auto mt-12 pt-8 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'} ${focusMode ? 'sr-only' : ''}`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Share this article</h3>
              <div className="flex space-x-3 mb-6 md:mb-0">
                <button 
                  onClick={() => shareArticle('twitter')}
                  className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center transition-colors group"
                  aria-label="Share on Twitter"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-purple-400 transition-colors">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => shareArticle('facebook')}
                  className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center transition-colors group"
                  aria-label="Share on Facebook"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-purple-400 transition-colors">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </button>
                <button 
                  onClick={() => shareArticle('linkedin')}
                  className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center transition-colors group"
                  aria-label="Share on LinkedIn"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-purple-400 transition-colors">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                    <rect x="2" y="9" width="4" height="12"></rect>
                    <circle cx="4" cy="4" r="2"></circle>
                  </svg>
                </button>
                <button 
                  onClick={() => shareArticle('copy')}
                  className="w-10 h-10 rounded-full bg-slate-800/70 hover:bg-slate-700 flex items-center justify-center transition-colors group"
                  aria-label="Copy link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 group-hover:text-purple-400 transition-colors">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-500/20 overflow-hidden hover:border-purple-500/40 transition-colors p-4 transform hover:scale-105 transition-transform">
                <h3 className="text-lg font-bold text-white mb-2">Continue Learning</h3>
                <p className="text-slate-400 text-sm mb-3">
                  Explore more articles on Bitcoin and cryptocurrency
                </p>
                <Link
                  href="/learn"
                  className="text-purple-500 text-sm inline-flex items-center group"
                >
                  <span>Browse articles</span>
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {!focusMode && <Footer />}
      
      {/* Custom styles for article content */}
      <style jsx global>{`
        .article-content {
          line-height: 1.8;
        }
        
        .article-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .article-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .article-content h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .article-content p {
          margin-bottom: 1.5em;
        }
        
        .article-content ul, .article-content ol {
          margin-bottom: 1.5em;
          padding-left: 1.5em;
        }
        
        .article-content li {
          margin-bottom: 0.5em;
        }
        
        .article-content blockquote {
          border-left: 4px solid #3b82f6;
          padding-left: 1em;
          margin-left: 0;
          margin-right: 0;
          font-style: italic;
          margin-bottom: 1.5em;
        }
        
        .article-content pre {
          background-color: #1e293b;
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          margin-bottom: 1.5em;
        }
        
        .article-content code {
          font-family: monospace;
          background-color: rgba(30, 41, 59, 0.5);
          padding: 0.2em 0.4em;
          border-radius: 0.25em;
        }
        
        .article-content img {
          max-width: 100%;
          height: auto;
          margin: 1.5em 0;
          border-radius: 0.5em;
        }
        
        .article-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        
        .article-content a:hover {
          text-decoration: none;
        }
        
        /* Focus mode styles */
        ${focusMode ? `
          body {
            overflow: hidden;
          }
          
          /* Force hide the navbar in focus mode */
          nav {
            display: none !important;
          }
          
          /* Header transition */
          .fixed {
            animation: fadeIn 0.8s ease-in-out;
          }
          
          .article-content {
            line-height: 2;
            font-size: ${fontSize + 2}px;
            max-width: 70ch;
            margin: 0 auto;
            padding: 0 1em;
            letter-spacing: 0.01em;
            animation: slideUp 0.8s ease-out;
            font-family: 'Georgia', serif;
          }
          
          .article-content p {
            margin-bottom: 2em;
          }
          
          .article-content h1, 
          .article-content h2, 
          .article-content h3 {
            font-family: 'Georgia', serif;
            letter-spacing: -0.02em;
          }
          
          .article-content p, 
          .article-content li {
            font-family: 'Georgia', serif;
          }
          
          /* Add a subtle fade effect to the top and bottom */
          .container::before,
          .container::after {
            content: '';
            position: fixed;
            left: 0;
            right: 0;
            height: 5rem;
            pointer-events: none;
            z-index: 10;
          }
          
          .container::before {
            top: 0;
            background: linear-gradient(to bottom, 
              ${darkMode ? 'rgba(3, 7, 18, 1)' : 'rgba(241, 245, 249, 1)'} 0%, 
              ${darkMode ? 'rgba(3, 7, 18, 0)' : 'rgba(241, 245, 249, 0)'} 100%);
          }
          
          .container::after {
            bottom: 0;
            background: linear-gradient(to top, 
              ${darkMode ? 'rgba(3, 7, 18, 1)' : 'rgba(241, 245, 249, 1)'} 0%, 
              ${darkMode ? 'rgba(3, 7, 18, 0)' : 'rgba(241, 245, 249, 0)'} 100%);
          }
          
          /* Improve focus on current paragraph */
          .article-content p:hover,
          .article-content h1:hover,
          .article-content h2:hover,
          .article-content h3:hover,
          .article-content ul:hover,
          .article-content ol:hover,
          .article-content blockquote:hover {
            background-color: ${darkMode ? 'rgba(30, 41, 59, 0.2)' : 'rgba(241, 245, 249, 0.5)'};
            border-radius: 0.25em;
            transition: background-color 0.3s ease;
          }
          
          /* Enhance blockquotes in focus mode */
          .article-content blockquote {
            border-left: 4px solid #0891b2;
            background-color: ${darkMode ? 'rgba(8, 145, 178, 0.1)' : 'rgba(8, 145, 178, 0.05)'};
            padding: 1em 1.5em;
            border-radius: 0.25em;
            font-style: italic;
            margin: 2em 0;
          }
          
          /* Enhance code blocks in focus mode */
          .article-content pre {
            background-color: ${darkMode ? '#111827' : '#f8fafc'};
            border: 1px solid ${darkMode ? '#1f2937' : '#e2e8f0'};
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { 
              transform: translateY(20px);
              opacity: 0;
            }
            to { 
              transform: translateY(0);
              opacity: 1;
            }
          }
        ` : ''}
      `}</style>
    </div>
  );
}
