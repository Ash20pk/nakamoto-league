import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import ReactMarkdown from 'react-markdown';
import TurndownService from 'turndown';
import { 
  Bold, Italic, List, ListOrdered, Quote, Code, Link as LinkIcon, 
  Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, 
  Heading2, Heading3, Type, Eye, Code2, Underline as UnderlineIcon, 
  ChevronDown, ChevronUp, Clock, Maximize, Minimize, X, 
  Highlighter, Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Table as TableIcon, Palette, FontFamily as FontFamilyIcon
} from 'lucide-react';
import './TipTapEditor.css';

interface TipTapEditorProps {
  initialValue: string;
  onChange: (content: string) => void;
  onFullScreenChange?: (isFullScreen: boolean) => void;
  onExitFocusMode?: () => void;
  placeholder?: string;
  onFocus?: () => void;
  showPreview?: boolean;
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
  showPreview = false,
  title = 'Article Title',
  author = 'Author Name',
  readingTime: externalReadingTime,
  bannerUrl = null,
  isFullScreen: externalFullScreen = false
}) => {
  const [markdown, setMarkdown] = useState('');
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(externalReadingTime || 1);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullScreenInternal, setIsFullScreenInternal] = useState(externalFullScreen);

  // Convert Markdown to HTML for editor initialization
  const markdownToHtml = (md: string) => {
    if (!md) return '';
    
    let html = md;
    
    // Replace headings
    html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    
    // Replace formatting
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<u>$1</u>');
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Replace lists
    let lines = html.split('\n');
    let inList = false;
    let listType = '';
    let newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (line.match(/^- /)) {
        if (!inList || listType !== 'ul') {
          if (inList) newLines.push(`</${listType}>`);
          newLines.push('<ul>');
          inList = true;
          listType = 'ul';
        }
        newLines.push(`<li>${line.substring(2)}</li>`);
      } else if (line.match(/^\d+\. /)) {
        if (!inList || listType !== 'ol') {
          if (inList) newLines.push(`</${listType}>`);
          newLines.push('<ol>');
          inList = true;
          listType = 'ol';
        }
        newLines.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
      } else {
        if (inList) {
          newLines.push(`</${listType}>`);
          inList = false;
        }
        newLines.push(line);
      }
    }
    
    if (inList) {
      newLines.push(`</${listType}>`);
    }
    
    html = newLines.join('\n');
    
    // Replace blockquotes
    html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
    
    // Replace links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
    
    // Replace images
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
    
    // Wrap paragraphs (text separated by blank lines)
    html = html.replace(/^([^<].*[^>])$/gm, '<p>$1</p>');
    
    return html;
  };

  // Initialize TipTap editor with useCallback to ensure proper initialization
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Typography,
      Highlight,
      Subscript,
      Superscript,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      FontFamily,
    ],
    content: initialValue ? markdownToHtml(initialValue) : '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      setMarkdown(md);
      onChange(md);
      calculateWordCount(md);
    },
    onFocus: () => {
      if (onFocus) onFocus();
    },
    autofocus: false,
    editable: true,
  });

  // Convert HTML to Markdown
  const htmlToMarkdown = (html: string) => {
    const turndownService = new TurndownService();
    return turndownService.turndown(html);
  };

  // Make sure editor is updated when initialValue changes
  useEffect(() => {
    if (editor && initialValue && editor.getHTML() !== markdownToHtml(initialValue)) {
      editor.commands.setContent(markdownToHtml(initialValue));
    }
  }, [editor, initialValue]);

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

  // Handle markdown textarea change
  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMarkdown(e.target.value);
    onChange(e.target.value);
    calculateWordCount(e.target.value);
  };

  // Handle editor focus
  const handleEditorFocus = () => {
    if (onFocus) onFocus();
    if (!focusMode) {
      setFocusMode(true);
    }
  };

  // Toggle markdown mode
  const toggleMarkdownMode = () => {
    setIsMarkdownMode(!isMarkdownMode);
  };

  // Toggle focus mode
  const toggleFocusMode = () => {
    const newFocusMode = !focusMode;
    setFocusMode(newFocusMode);
    
    if (!newFocusMode) {
      // When exiting focus mode, also exit fullscreen if needed
      if (isFullScreenInternal) {
        // Exit full screen
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
        setIsFullScreenInternal(false);
        
        // Notify parent component if callback exists
        if (onFullScreenChange) {
          onFullScreenChange(false);
        }
      }
      setShowAdvancedOptions(false);
      if (onExitFocusMode) {
        onExitFocusMode();
      }
    } else {
      // When entering focus mode, hide other UI elements
      setShowAdvancedOptions(false);
    }
  };

  // Toggle full screen mode
  const toggleFullScreen = () => {
    const newFullScreenState = !isFullScreenInternal;
    setIsFullScreenInternal(newFullScreenState);
    
    // If component has an onFullScreenChange prop, call it
    if (onFullScreenChange) {
      onFullScreenChange(newFullScreenState);
    }
    
    // Handle browser fullscreen API
    if (newFullScreenState) {
      // Enter full screen
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } else {
      // Exit full screen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreenInternal(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Sync with external fullscreen state
  useEffect(() => {
    setIsFullScreenInternal(externalFullScreen);
  }, [externalFullScreen]);

  // Toggle advanced formatting options
  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  // Editor commands
  const editorCommands = {
    bold: () => editor?.chain().focus().toggleBold().run(),
    italic: () => editor?.chain().focus().toggleItalic().run(),
    underline: () => editor?.chain().focus().toggleUnderline().run(),
    h1: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
    h2: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    h3: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    paragraph: () => editor?.chain().focus().setParagraph().run(),
    ul: () => editor?.chain().focus().toggleBulletList().run(),
    ol: () => editor?.chain().focus().toggleOrderedList().run(),
    blockquote: () => editor?.chain().focus().toggleBlockquote().run(),
    code: () => editor?.chain().focus().toggleCodeBlock().run(),
    link: () => {
      const url = prompt('Enter URL:');
      if (url) {
        editor?.chain().focus().setLink({ href: url }).run();
      }
    },
    image: () => {
      const url = prompt('Enter image URL:');
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    },
    alignLeft: () => editor?.chain().focus().setTextAlign('left').run(),
    alignCenter: () => editor?.chain().focus().setTextAlign('center').run(),
    alignRight: () => editor?.chain().focus().setTextAlign('right').run(),
    table: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    highlight: () => editor?.chain().focus().toggleHighlight().run(),
    subscript: () => editor?.chain().focus().toggleSubscript().run(),
    superscript: () => editor?.chain().focus().toggleSuperscript().run(),
  };

  return (
    <div className={`flex flex-col h-full relative ${focusMode ? 'focus-mode' : ''} ${isFullScreenInternal ? 'fullscreen-mode' : ''}`}>
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
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullScreen}
              className="flex items-center gap-1 text-sm bg-gray-800 hover:bg-gray-700 text-cyan px-3 py-1 rounded mr-2"
              title={isFullScreenInternal ? "Exit Full Screen" : "Enter Full Screen"}
            >
              {isFullScreenInternal ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
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
      
      <div className={`flex-1 flex ${focusMode && showPreview ? 'flex-col md:flex-row' : ''}`}>
        {isMarkdownMode ? (
          <textarea
            value={markdown}
            onChange={handleMarkdownChange}
            onFocus={handleEditorFocus}
            className={`flex-1 bg-black text-white p-6 rounded outline-none font-mono resize-none text-lg ${
              focusMode && showPreview ? 'md:w-2/3' : 'w-full'
            }`}
            placeholder={placeholder}
            style={{ minHeight: 'calc(100vh - 240px)' }}
            wrap="soft"
          />
        ) : (
          <div className={`${focusMode && showPreview ? 'md:w-2/3' : 'w-full'} tiptap-editor-wrapper`}>
            {editor && (
              <>
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
                    onClick={() => editorCommands.bold()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => editorCommands.italic()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => editorCommands.underline()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('underline') ? 'bg-gray-700' : ''}`}
                    title="Underline"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </button>
                  <span className="border-r border-gray-700 mx-1"></span>
                  <button 
                    onClick={() => editorCommands.h1()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}`}
                    title="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => editorCommands.h2()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
                    title="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => editorCommands.h3()} 
                    className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-700' : ''}`}
                    title="Heading 3"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>
                </BubbleMenu>
                
                <EditorContent 
                  editor={editor} 
                  className={`bg-black text-white p-6 rounded outline-none overflow-auto text-lg leading-relaxed ${
                    focusMode ? 'max-w-none mx-auto' : 'w-full'
                  } ${focusMode && showPreview ? 'md:w-full max-w-none' : ''} tiptap-editor`}
                  style={{ 
                    minHeight: 'calc(100vh - 240px)',
                    wordWrap: 'break-word',
                    cursor: 'text',
                  }}
                  onClick={() => editor?.commands.focus()}
                  onFocus={handleEditorFocus}
                />
              </>
            )}
          </div>
        )}
        
        {/* Preview panel in focus mode */}
        {focusMode && showPreview && (
          <div className="md:w-1/3 bg-black rounded overflow-auto mt-4 md:mt-0 md:ml-4">
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
      {!isMarkdownMode && !focusMode && editor && (
        <div className="bg-gray-800 rounded-lg mt-2 p-2 flex flex-wrap items-center gap-2 border-t border-gray-700">
          <div className="flex items-center">
            <button 
              onClick={() => editorCommands.bold()} 
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button 
              onClick={() => editorCommands.italic()} 
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button 
              onClick={() => editorCommands.underline()} 
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('underline') ? 'bg-gray-700' : ''}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
            <span className="border-r border-gray-700 mx-2"></span>
            <button 
              onClick={() => editorCommands.h1()} 
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => editorCommands.h2()} 
              className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => editorCommands.h3()} 
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
              onClick={toggleAdvancedOptions}
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
                onClick={() => editorCommands.ul()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('bulletList') ? 'bg-gray-700' : ''}`}
                title="Bullet List"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.ol()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('orderedList') ? 'bg-gray-700' : ''}`}
                title="Numbered List"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.blockquote()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('blockquote') ? 'bg-gray-700' : ''}`}
                title="Quote"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.code()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('codeBlock') ? 'bg-gray-700' : ''}`}
                title="Code Block"
              >
                <Code className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={() => editorCommands.link()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('link') ? 'bg-gray-700' : ''}`}
                title="Insert Link"
              >
                <LinkIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.image()} 
                className="p-1.5 hover:bg-gray-700 rounded"
                title="Insert Image"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.table()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('table') ? 'bg-gray-700' : ''}`}
                title="Insert Table"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={() => editorCommands.alignLeft()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-700' : ''}`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.alignCenter()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-700' : ''}`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.alignRight()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-700' : ''}`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
              <span className="border-r border-gray-700 mx-1 h-6"></span>
              <button 
                onClick={() => editorCommands.highlight()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('highlight') ? 'bg-gray-700' : ''}`}
                title="Highlight Text"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.subscript()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('subscript') ? 'bg-gray-700' : ''}`}
                title="Subscript"
              >
                <SubscriptIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={() => editorCommands.superscript()} 
                className={`p-1.5 hover:bg-gray-700 rounded ${editor.isActive('superscript') ? 'bg-gray-700' : ''}`}
                title="Superscript"
              >
                <SuperscriptIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Minimal bottom toolbar for focus mode */}
      {!isMarkdownMode && focusMode && editor && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full p-2 flex items-center gap-2 border border-gray-700 opacity-30 hover:opacity-100 transition-opacity shadow-lg">
          <button 
            onClick={() => editorCommands.bold()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('bold') ? 'bg-gray-700' : ''}`}
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.italic()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('italic') ? 'bg-gray-700' : ''}`}
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.h2()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}`}
            title="Heading"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.link()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('link') ? 'bg-gray-700' : ''}`}
            title="Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <span className="border-r border-gray-700 mx-1 h-6"></span>
          <button 
            onClick={() => editorCommands.highlight()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('highlight') ? 'bg-gray-700' : ''}`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.ul()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('bulletList') ? 'bg-gray-700' : ''}`}
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.blockquote()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('blockquote') ? 'bg-gray-700' : ''}`}
            title="Quote"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.code()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('codeBlock') ? 'bg-gray-700' : ''}`}
            title="Code"
          >
            <Code className="w-4 h-4" />
          </button>
          <button 
            onClick={() => editorCommands.table()} 
            className={`p-1.5 hover:bg-gray-700 rounded-full ${editor.isActive('table') ? 'bg-gray-700' : ''}`}
            title="Table"
          >
            <TableIcon className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Preview component */}
      {focusMode && showPreview && (
        <div className="md:w-1/3 bg-black rounded overflow-auto mt-4 md:mt-0 md:ml-4">
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

export default TipTapEditor;
