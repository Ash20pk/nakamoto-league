'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, Italic, List, ListOrdered, Quote, Code, Link as LinkIcon, 
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, 
  Heading2, Heading3, Type, Eye, Code2, Save, X, Underline, ChevronDown, ChevronUp, Clock,
  Maximize, Minimize
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RichTextEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  showPreview?: boolean;
  title?: string;
  author?: string;
  readingTime?: number;
  bannerUrl?: string | null;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  initialValue, 
  onChange,
  placeholder = 'Start writing your article...',
  onFocus,
  showPreview = false,
  title = 'Article Title',
  author = 'Author Name',
  readingTime: externalReadingTime,
  bannerUrl = null
}) => {
  const [content, setContent] = useState(initialValue);
  const [markdown, setMarkdown] = useState('');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(externalReadingTime || 1);
  const [hasSelection, setHasSelection] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Selection | null>(null);

  // Convert HTML to Markdown
  const htmlToMarkdown = (html: string) => {
    // This is a simplified conversion - in a real app, use a proper library
    let md = html;
    
    // Replace headings
    md = md.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
    md = md.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
    md = md.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
    
    // Replace formatting
    md = md.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    md = md.replace(/<em>(.*?)<\/em>/g, '*$1*');
    md = md.replace(/<u>(.*?)<\/u>/g, '_$1_');
    md = md.replace(/<code>(.*?)<\/code>/g, '`$1`');
    
    // Replace lists
    md = md.replace(/<ul>(.*?)<\/ul>/g, (match, p1) => {
      return p1.replace(/<li>(.*?)<\/li>/g, '- $1\n');
    });
    md = md.replace(/<ol>(.*?)<\/ol>/g, (match, p1) => {
      let index = 1;
      return p1.replace(/<li>(.*?)<\/li>/g, () => {
        return `${index++}. $1\n`;
      });
    });
    
    // Replace blockquotes
    md = md.replace(/<blockquote>(.*?)<\/blockquote>/g, '> $1\n\n');
    
    // Replace links
    md = md.replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)');
    
    // Replace images
    md = md.replace(/<img src="(.*?)" alt="(.*?)">/g, '![$2]($1)');
    
    // Replace paragraphs
    md = md.replace(/<p>(.*?)<\/p>/g, '$1\n\n');
    
    // Clean up
    md = md.replace(/\n\n+/g, '\n\n');
    
    return md.trim();
  };

  // Calculate word count and reading time
  const calculateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const count = words.length;
    setWordCount(count);
    
    // Calculate reading time (average reading speed: 200 words per minute)
    const minutes = Math.ceil(count / 200);
    setReadingTime(Math.max(1, minutes)); // Minimum 1 minute
    
    return count;
  };

  useEffect(() => {
    // Convert content to markdown for the preview
    const md = htmlToMarkdown(content);
    setMarkdown(md);
    onChange(md); // Pass markdown to parent
    
    // Calculate word count and reading time
    calculateWordCount(md);
  }, [content, onChange]);

  const handleEditorChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
    onChange(e.target.value);
    calculateWordCount(e.target.value);
  };

  const toggleMarkdownMode = () => {
    setIsMarkdownMode(!isMarkdownMode);
  };

  // Toggle focus mode
  const toggleFocusMode = () => {
    setFocusMode(!focusMode);
    if (!focusMode) {
      // When entering focus mode, hide other UI elements
      setShowAdvancedOptions(false);
    }
  };

  // Handle editor focus
  const handleEditorFocus = () => {
    if (onFocus) onFocus();
  };

  // Handle text selection
  const handleSelectionChange = () => {
    // Use setTimeout to ensure the selection is processed after the browser has updated
    setTimeout(() => {
      const selection = window.getSelection();
      selectionRef.current = selection;
      
      if (selection && selection.toString().trim().length > 0 && editorRef.current) {
        setHasSelection(true);
        
        // Get selection coordinates to position the toolbar
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        
        setToolbarPosition({
          top: rect.top - editorRect.top - 40, // Position above the selection
          left: rect.left + (rect.width / 2) - editorRect.left
        });
        
        setShowToolbar(true);
      } else {
        // Don't hide toolbar immediately to allow clicking on buttons
        // setHasSelection(false);
        // setShowToolbar(false);
      }
    }, 0);
  };

  // Toggle advanced formatting options
  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  // Formatting functions
  const applyFormatting = (format: string) => {
    // Restore selection if it was lost when clicking the toolbar
    if (selectionRef.current && !window.getSelection()?.toString()) {
      const sel = window.getSelection();
      if (sel && selectionRef.current.rangeCount > 0) {
        sel.removeAllRanges();
        for (let i = 0; i < selectionRef.current.rangeCount; i++) {
          sel.addRange(selectionRef.current.getRangeAt(i).cloneRange());
        }
      }
    }
    
    if (!editorRef.current) return;
    
    document.execCommand('styleWithCSS', false, 'true');
    
    switch (format) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'h1':
        document.execCommand('formatBlock', false, '<h1>');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, '<h2>');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, '<h3>');
        break;
      case 'paragraph':
        document.execCommand('formatBlock', false, '<p>');
        break;
      case 'ul':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'ol':
        document.execCommand('insertOrderedList', false);
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, '<blockquote>');
        break;
      case 'code':
        document.execCommand('formatBlock', false, '<pre>');
        break;
      case 'link':
        const url = prompt('Enter URL:');
        if (url) document.execCommand('createLink', false, url);
        break;
      case 'image':
        const imgUrl = prompt('Enter image URL:');
        if (imgUrl) document.execCommand('insertImage', false, imgUrl);
        break;
      case 'alignLeft':
        document.execCommand('justifyLeft', false);
        break;
      case 'alignCenter':
        document.execCommand('justifyCenter', false);
        break;
      case 'alignRight':
        document.execCommand('justifyRight', false);
        break;
      default:
        break;
    }
    
    handleEditorChange();
    
    // Don't hide toolbar after formatting
    setTimeout(handleSelectionChange, 10);
  };

  // Prevent default context menu and show our formatting menu instead
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handleSelectionChange();
  };

  return (
    <div className={`flex flex-col h-full relative ${focusMode ? 'focus-mode' : ''}`}>
      {/* Header with word count and mode toggles */}
      {!focusMode && (
        <div className="flex justify-end items-center mb-2">
          <div className="flex items-center mr-auto text-sm text-gray-400">
            <span className="mr-4">
              <span className="font-semibold">{wordCount}</span> words
            </span>
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span className="font-semibold">{readingTime}</span> min read
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
            title={focusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
          >
            {focusMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}
      
      {/* Focus mode header - minimal */}
      {focusMode && (
        <div className="flex justify-between items-center mb-2 opacity-30 hover:opacity-100 transition-opacity">
          <div className="flex items-center text-sm text-gray-400">
            <span className="mr-4">
              <span className="font-semibold">{wordCount}</span> words
            </span>
            <span className="flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-gray-500" />
              <span className="font-semibold">{readingTime}</span> min read
            </span>
          </div>
          <button
            onClick={toggleFocusMode}
            className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded"
            title="Exit Focus Mode"
          >
            <Minimize className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Selection Toolbar - appears when text is selected */}
      {showToolbar && hasSelection && !isMarkdownMode && (
        <div 
          ref={toolbarRef}
          className="absolute z-20 bg-gray-800 rounded-lg shadow-lg p-2 flex flex-wrap gap-1 border border-gray-700 transition-all duration-200 backdrop-blur-sm"
          style={{ 
            top: `${toolbarPosition.top}px`, 
            left: `${toolbarPosition.left}px`,
            transform: 'translateX(-50%)'
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent losing selection when clicking toolbar
        >
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('bold'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('italic'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('underline'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Underline"
          >
            <Underline className="w-4 h-4" />
          </button>
          <span className="border-r border-gray-700 mx-1"></span>
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('h1'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('h2'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); applyFormatting('h3'); }} 
            className="p-1.5 hover:bg-gray-700 rounded" 
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button 
            onMouseDown={(e) => { e.preventDefault(); setShowToolbar(false); }} 
            className="p-1.5 hover:bg-gray-700 rounded ml-1" 
            title="Close Toolbar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <div className={`flex-1 flex ${focusMode && showPreview ? 'flex-col md:flex-row' : ''}`}>
        {isMarkdownMode ? (
          <textarea
            value={markdown}
            onChange={handleMarkdownChange}
            onFocus={handleEditorFocus}
            className={`flex-1 bg-black text-white p-6 rounded outline-none font-mono resize-none text-lg ${
              focusMode && showPreview ? 'md:w-1/2' : 'w-full'
            }`}
            placeholder={placeholder}
            style={{ minHeight: 'calc(100vh - 240px)' }}
            wrap="soft"
          />
        ) : (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorChange}
            onFocus={handleEditorFocus}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onContextMenu={handleContextMenu}
            dangerouslySetInnerHTML={{ __html: content }}
            className={`flex-1 bg-black text-white p-6 rounded outline-none overflow-auto text-lg leading-relaxed ${
              focusMode ? 'max-w-3xl mx-auto' : 'w-full'
            } ${focusMode && showPreview ? 'md:w-1/2 max-w-none' : ''}`}
            style={{ 
              minHeight: 'calc(100vh - 240px)',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap',
              userSelect: 'text' // Ensure text is selectable
            }}
            onSelect={handleSelectionChange}
          />
        )}
        
        {/* Preview panel in focus mode */}
        {focusMode && showPreview && (
          <div className="md:w-1/2 bg-black rounded overflow-auto mt-4 md:mt-0 md:ml-4">
            <MarkdownPreview 
              markdown={markdown} 
              title={title} 
              author={author} 
              readingTime={readingTime}
              bannerUrl={bannerUrl}
            />
          </div>
        )}
      </div>
      
      {/* Fixed Bottom Toolbar - hidden in focus mode */}
      {!isMarkdownMode && !focusMode && (
        <div className="bg-gray-800 rounded-lg mt-2 p-2 flex flex-wrap items-center gap-2 border-t border-gray-700">
          <div className="flex items-center">
            <button onClick={() => applyFormatting('bold')} className="p-1.5 hover:bg-gray-700 rounded" title="Bold">
              <Bold className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('italic')} className="p-1.5 hover:bg-gray-700 rounded" title="Italic">
              <Italic className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('underline')} className="p-1.5 hover:bg-gray-700 rounded" title="Underline">
              <Underline className="w-4 h-4" />
            </button>
            <span className="border-r border-gray-700 mx-2 h-6"></span>
            <button onClick={() => applyFormatting('h1')} className="p-1.5 hover:bg-gray-700 rounded" title="Heading 1">
              <Heading1 className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('h2')} className="p-1.5 hover:bg-gray-700 rounded" title="Heading 2">
              <Heading2 className="w-4 h-4" />
            </button>
            <button onClick={() => applyFormatting('h3')} className="p-1.5 hover:bg-gray-700 rounded" title="Heading 3">
              <Heading3 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="ml-auto flex items-center">
            <button
              onClick={toggleFocusMode}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-gray-700 mr-2"
              title="Enter Focus Mode"
            >
              <Maximize className="w-4 h-4" />
              <span className="text-sm">Focus</span>
            </button>
            <button
              onClick={toggleAdvancedOptions}
              className="flex items-center gap-1 text-sm px-2 py-1 rounded hover:bg-gray-700"
              title="More formatting options"
            >
              {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span className="text-sm">More</span>
            </button>
          </div>
          
          {/* Advanced formatting options */}
          {showAdvancedOptions && (
            <div className="w-full mt-2 pt-2 border-t border-gray-700 flex flex-wrap gap-2">
              <button onClick={() => applyFormatting('ul')} className="p-1.5 hover:bg-gray-700 rounded" title="Bullet List">
                <List className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('ol')} className="p-1.5 hover:bg-gray-700 rounded" title="Numbered List">
                <ListOrdered className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('blockquote')} className="p-1.5 hover:bg-gray-700 rounded" title="Quote">
                <Quote className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('code')} className="p-1.5 hover:bg-gray-700 rounded" title="Code Block">
                <Code className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button onClick={() => applyFormatting('link')} className="p-1.5 hover:bg-gray-700 rounded" title="Insert Link">
                <LinkIcon className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('image')} className="p-1.5 hover:bg-gray-700 rounded" title="Insert Image">
                <ImageIcon className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button onClick={() => applyFormatting('alignLeft')} className="p-1.5 hover:bg-gray-700 rounded" title="Align Left">
                <AlignLeft className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('alignCenter')} className="p-1.5 hover:bg-gray-700 rounded" title="Align Center">
                <AlignCenter className="w-4 h-4" />
              </button>
              <button onClick={() => applyFormatting('alignRight')} className="p-1.5 hover:bg-gray-700 rounded" title="Align Right">
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Minimal bottom toolbar for focus mode */}
      {!isMarkdownMode && focusMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-2 flex items-center gap-2 border border-gray-700 opacity-30 hover:opacity-100 transition-opacity shadow-lg">
          <button onClick={() => applyFormatting('bold')} className="p-1.5 hover:bg-gray-700 rounded-full" title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('italic')} className="p-1.5 hover:bg-gray-700 rounded-full" title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('h2')} className="p-1.5 hover:bg-gray-700 rounded-full" title="Heading">
            <Heading2 className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormatting('link')} className="p-1.5 hover:bg-gray-700 rounded-full" title="Link">
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// Preview component
export const MarkdownPreview: React.FC<{ markdown: string; title?: string; author?: string; readingTime?: number; bannerUrl?: string | null }> = ({ 
  markdown, 
  title = 'Article Title',
  author = 'Author Name',
  readingTime = 5,
  bannerUrl = null
}) => {
  return (
    <div className="bg-black text-white p-6 rounded overflow-auto prose prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-6">{title}</h1>
      
      {bannerUrl && (
        <div className="my-6">
          <img 
            src={bannerUrl} 
            alt="Article banner" 
            className="w-full h-auto rounded-lg object-cover max-h-80"
          />
        </div>
      )}
      
      <div className="flex items-center text-sm text-gray-400 mb-8 border-b border-gray-800 pb-4">
        <span className="font-medium">{author}</span>
        <span className="mx-2">•</span>
        <span>{readingTime} min read</span>
        <span className="mx-2">•</span>
        <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>
      
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
};

export default RichTextEditor;
