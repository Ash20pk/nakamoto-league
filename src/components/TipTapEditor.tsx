import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Code, Link as LinkIcon, 
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, 
  Heading2, Heading3, Type, Maximize, Minimize, X, Pilcrow,
  Highlighter, Table as TableIcon, Clock, Code2, ChevronDown, ChevronUp
} from 'lucide-react';
import MarkdownPreview from './MarkdownPreview';
import './TipTapEditor.css';

interface TipTapEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  onExitFocusMode?: () => void;
  placeholder?: string;
  onFocus?: () => void;
  title?: string;
  author?: string;
  readingTime?: number;
  bannerUrl?: string | null;
  isFullScreen?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({ 
  initialValue, 
  onChange,
  onFullScreenChange,
  onExitFocusMode,
  placeholder = 'Start writing your article...',
  onFocus,
  title = 'Article Title',
  author = 'Author Name',
  readingTime = 5,
  bannerUrl = null,
  isFullScreen = false
}) => {
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Simple markdown to HTML conversion for initialization
  const markdownToHtml = (markdown: string): string => {
    if (!markdown) return '<p></p>';
    
    // Simple conversion - let the rich text editor handle the formatting
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/_(.*?)_/gim, '<u>$1</u>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.startsWith('<h') || paragraph.startsWith('<blockquote') || paragraph.includes('<li>')) {
          return paragraph;
        }
        return paragraph.trim() ? `<p>${paragraph}</p>` : '';
      })
      .filter(p => p)
      .join('\n');

    // Wrap lists
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    return html || '<p></p>';
  };

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        bulletList: {
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'tiptap-list-item',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-cyan-400 underline cursor-pointer',
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-300 text-black px-1 rounded',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: markdownToHtml(initialValue),
    enableInputRules: false, // Disable automatic input rules that cause unwanted bullet lists
    autofocus: false, // Prevent automatic focusing that can cause cursor jumping
    onUpdate: ({ editor, transaction }) => {
      // Only update if the content actually changed
      if (transaction.docChanged) {
        const html = editor.getHTML();
        onChange(html); // Send HTML directly to parent - let backend handle markdown
        updateWordCount(html);
      }
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert prose-lg max-w-none focus:outline-none px-6 py-4',
      },
    },
    immediatelyRender: false,
  });

  // Update word count
  const updateWordCount = (html: string) => {
    if (!html || html === '<p></p>' || html === '<p><br></p>') {
      setWordCount(0);
      return;
    }
    const text = html.replace(/<[^>]*>/g, '').trim();
    if (!text) {
      setWordCount(0);
      return;
    }
    const words = text.split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  };

  // Update editor content when initialValue changes (only on initial load)
  useEffect(() => {
    if (editor && initialValue && !isInitialized) {
      const html = markdownToHtml(initialValue);
      editor.commands.setContent(html);
      setMarkdownContent(initialValue);
      updateWordCount(html); // Initialize word count
      setIsInitialized(true);
    }
  }, [editor, initialValue, isInitialized]);

  // Initialize word count when editor is ready
  useEffect(() => {
    if (editor && !isInitialized) {
      const html = editor.getHTML();
      updateWordCount(html);
    }
  }, [editor, isInitialized]);

  // Update current time every second when in focus mode
  useEffect(() => {
    if (focusMode) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [focusMode]);

  // Editor commands
  const commands = {
    bold: () => editor?.chain().focus().toggleBold().run(),
    italic: () => editor?.chain().focus().toggleItalic().run(),
    underline: () => editor?.chain().focus().toggleUnderline().run(),
    paragraph: () => editor?.chain().focus().setParagraph().run(),
    h1: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    h2: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    bulletList: () => editor?.chain().focus().toggleBulletList().run(),
    orderedList: () => editor?.chain().focus().toggleOrderedList().run(),
    blockquote: () => editor?.chain().focus().toggleBlockquote().run(),
    codeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
    highlight: () => editor?.chain().focus().toggleHighlight().run(),
    link: () => {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor?.chain().focus().setLink({ href: url }).run();
      }
    },
    image: () => {
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    },
    table: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    alignLeft: () => editor?.chain().focus().setTextAlign('left').run(),
    alignCenter: () => editor?.chain().focus().setTextAlign('center').run(),
    alignRight: () => editor?.chain().focus().setTextAlign('right').run(),
  };

  // Toggle markdown mode
  const toggleMarkdownMode = () => {
    if (!isMarkdownMode) {
      // Convert HTML to markdown for editing
      const html = editor?.getHTML() || '';
      setMarkdownContent(htmlToSimpleMarkdown(html));
    } else {
      // Convert markdown back to HTML
      const html = markdownToHtml(markdownContent);
      editor?.commands.setContent(html);
    }
    setIsMarkdownMode(!isMarkdownMode);
  };

  // Simple HTML to markdown conversion
  const htmlToSimpleMarkdown = (html: string): string => {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  // Handle focus mode
  const handleEditorFocus = () => {
    if (onFocus) onFocus();
    if (!focusMode) {
      setFocusMode(true);
      // Always set full screen when entering focus mode
      if (onFullScreenChange) {
        onFullScreenChange(true);
      }
    }
  };

  // Toggle focus mode
  const toggleFocusMode = () => {
    const newFocusMode = !focusMode;
    setFocusMode(newFocusMode);
    
    if (onFullScreenChange) {
      onFullScreenChange(newFocusMode);
    }
    
    if (!newFocusMode) {
      setShowAdvancedOptions(false);
      if (onExitFocusMode) {
        onExitFocusMode();
      }
    }
  };

  // Handle markdown textarea change
  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMarkdownContent(value);
    onChange(markdownToHtml(value));
    updateWordCount(markdownToHtml(value));
  };

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full relative ${focusMode ? 'focus-mode' : ''} ${isFullScreen ? 'fullscreen-mode' : ''}`}>
      {/* Header with word count and mode toggles */}
      {!focusMode && (
        <div className="flex justify-end items-center mb-2">
          <div className="flex items-center mr-auto text-sm text-gray-400">
            <span className="mr-4">
              <span className="font-semibold">{wordCount}</span> words
            </span>
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span className="font-semibold">{wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0}</span> min read
            </span>
          </div>
          <button
            onClick={toggleMarkdownMode}
            className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded mr-2"
          >
            {isMarkdownMode ? <Type className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            {isMarkdownMode ? 'Rich Text' : 'Markdown'}
          </button>
          <button
            onClick={toggleFocusMode}
            className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded"
            title="Enter Focus Mode"
          >
            <Maximize className="w-4 h-4" />
            Focus
          </button>
        </div>
      )}
      
      {/* Focus mode header - minimal and sleek with system time */}
      {focusMode && (
        <div className="flex justify-between items-center mb-2 opacity-30 hover:opacity-100 transition-opacity">
          <div className="flex items-center text-sm text-gray-400">
            <span className="font-semibold">{wordCount}</span>
            <span className="ml-1 text-gray-500">words</span>
          </div>
          
          <div className="flex items-center text-sm text-gray-400">
            <span className="font-semibold text-lg">
              {currentTime.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center text-sm text-gray-400">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span className="font-semibold">{wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0}</span>
              <span className="ml-1 text-gray-500">min read</span>
            </div>
            <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded"
              title="Exit Focus Mode"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 flex">
        {isMarkdownMode ? (
          <textarea
            value={markdownContent}
            onChange={handleMarkdownChange}
            onFocus={handleEditorFocus}
            className="flex-1 bg-black text-white p-6 rounded outline-none font-mono resize-none text-lg w-full"
            placeholder={placeholder}
            style={{ minHeight: 'calc(100vh - 240px)' }}
          />
        ) : (
          <div className="w-full tiptap-editor-wrapper">
            {/* Bubble menu - appears when text is selected */}
            <BubbleMenu 
              editor={editor} 
              tippyOptions={{ 
                duration: 100,
                placement: 'top',
                theme: 'dark',
                zIndex: 30,
              }}
              className="bg-gray-800 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 border border-gray-700 backdrop-blur-sm"
            >
              <button 
                onClick={commands.bold}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
                title="Bold"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.italic}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
                title="Italic"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.underline}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('underline') ? 'bg-gray-700' : ''}`}
                title="Underline"
              >
                <UnderlineIcon className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1"></span>
              <button 
                onClick={commands.h1}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}`}
                title="Heading 1"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.h2}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
                title="Heading 2"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.h3}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-700' : ''}`}
                title="Heading 3"
              >
                <Heading3 className="w-4 h-4" />
              </button>
            </BubbleMenu>
            
            <EditorContent 
              editor={editor} 
              className={`bg-black text-white p-6 rounded outline-none text-lg leading-relaxed w-full tiptap-editor ${
                focusMode ? 'max-w-none mx-auto overflow-visible' : 'overflow-auto'
              }`}
              style={{ 
                minHeight: focusMode ? 'calc(100vh - 180px)' : 'calc(100vh - 240px)',
                wordWrap: 'break-word',
                cursor: 'text',
                height: focusMode ? 'auto' : undefined,
              }}
              onClick={() => editor?.commands.focus()}
              onFocus={handleEditorFocus}
            />
          </div>
        )}
      </div>
      
      {/* Fixed Bottom Toolbar - hidden in focus mode */}
      {!isMarkdownMode && !focusMode && editor && (
        <div className="bg-gray-800 rounded-lg mt-2 p-2 flex flex-wrap items-center gap-2 border-t border-gray-700">
          <div className="flex items-center">
            <button 
              onClick={commands.bold}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button 
              onClick={commands.italic}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button 
              onClick={commands.underline}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('underline') ? 'bg-gray-700' : ''}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <span className="border-r border-gray-700 mx-2"></span>
            <button 
              onClick={commands.h1}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button 
              onClick={commands.h2}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button 
              onClick={commands.h3}
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-700' : ''}`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="ml-auto flex items-center">
            <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded mr-2"
              title="Enter Focus Mode"
            >
              <Maximize className="w-4 h-4" />
              <span className="text-sm">Focus</span>
            </button>
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded"
              title="More formatting options"
            >
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="text-sm">More</span>
            </button>
          </div>
          
          {/* Advanced formatting options */}
          {showAdvancedOptions && (
            <div className="w-full mt-2 pt-2 border-t border-gray-700 flex flex-wrap gap-2">
              <button 
                onClick={commands.bulletList}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bulletList') ? 'bg-gray-700' : ''}`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.orderedList}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('orderedList') ? 'bg-gray-700' : ''}`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.blockquote}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('blockquote') ? 'bg-gray-700' : ''}`}
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.codeBlock}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('codeBlock') ? 'bg-gray-700' : ''}`}
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={commands.link}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('link') ? 'bg-gray-700' : ''}`}
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.image}
                className="p-1.5 hover:bg-gray-700 rounded"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.table}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('table') ? 'bg-gray-700' : ''}`}
                title="Insert Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={commands.alignLeft}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-700' : ''}`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.alignCenter}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-700' : ''}`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button 
                onClick={commands.alignRight}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-700' : ''}`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={commands.highlight}
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('highlight') ? 'bg-gray-700' : ''}`}
                title="Highlight Text"
              >
                <Highlighter className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Comprehensive floating toolbar for focus mode - sleek design with all options */}
      {!isMarkdownMode && focusMode && editor && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 border-2 border-gray-600 rounded-full p-3 flex items-center gap-1 opacity-90 hover:opacity-100 transition-all duration-200 shadow-2xl z-[9999] backdrop-blur-sm">
          {/* Basic formatting */}
          <button 
            onClick={commands.bold}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.italic}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.underline}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('underline') ? 'bg-gray-700' : ''}`}
            title="Underline"
          >
            <UnderlineIcon className="w-4 h-4" />
          </button>
          
          <span className="border-r border-gray-700 mx-1 h-6"></span>
          
          {/* Headers and paragraph */}
          <button 
            onClick={commands.paragraph}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${!editor.isActive('heading') ? 'bg-gray-700' : ''}`}
            title="Paragraph"
          >
            <Pilcrow className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.h1}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}`}
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.h2}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.h3}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-700' : ''}`}
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          
          <span className="border-r border-gray-700 mx-1 h-6"></span>
          
          {/* Lists */}
          <button 
            onClick={commands.bulletList}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('bulletList') ? 'bg-gray-700' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.orderedList}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('orderedList') ? 'bg-gray-700' : ''}`}
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          
          <span className="border-r border-gray-700 mx-1 h-6"></span>
          
          {/* Advanced formatting */}
          <button 
            onClick={commands.blockquote}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('blockquote') ? 'bg-gray-700' : ''}`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.codeBlock}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('codeBlock') ? 'bg-gray-700' : ''}`}
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.highlight}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('highlight') ? 'bg-gray-700' : ''}`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.link}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('link') ? 'bg-gray-700' : ''}`}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={commands.table}
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('table') ? 'bg-gray-700' : ''}`}
            title="Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;