import React from 'react';

interface MarkdownPreviewProps {
  markdown?: string;
  htmlContent?: string;
  title?: string;
  author?: string;
  readingTime?: number;
  bannerUrl?: string | null;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ 
  markdown,
  htmlContent,
  title = 'Article Title',
  author = 'Author Name',
  readingTime = 5,
  bannerUrl = null
}) => {
  // Convert markdown to HTML if needed
  const convertMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';
    
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/_(.*?)_/gim, '<u>$1</u>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
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
      .join('\n')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  };

  // Determine content to display
  let content = '';
  if (htmlContent) {
    // If we have HTML content, use it directly
    content = htmlContent;
  } else if (markdown) {
    // If we have markdown, convert it to HTML
    content = convertMarkdownToHtml(markdown);
  }
  
  return (
    <div className="bg-black text-white p-6 rounded overflow-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">{title}</h1>
      
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
      
      {/* Rich text preview with proper styling */}
      <div 
        className="prose prose-invert prose-lg max-w-none rich-text-preview"
        style={{
          color: '#e5e7eb',
          lineHeight: '1.7',
          fontSize: '1.1rem'
        }}
      >
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <p className="text-gray-400">No content to preview</p>
        )}
      </div>
      
      <style jsx>{`
        .rich-text-preview h1 {
          color: #ffffff;
          font-size: 2.25rem;
          font-weight: 700;
          margin: 2rem 0 1rem 0;
          line-height: 1.2;
        }
        
        .rich-text-preview h2 {
          color: #ffffff;
          font-size: 1.875rem;
          font-weight: 600;
          margin: 1.75rem 0 0.75rem 0;
          line-height: 1.3;
        }
        
        .rich-text-preview h3 {
          color: #ffffff;
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.5rem 0 0.5rem 0;
          line-height: 1.4;
        }
        
        .rich-text-preview p {
          margin: 0.75rem 0;
          color: #e5e7eb;
        }
        
        .rich-text-preview strong {
          font-weight: 700;
          color: #ffffff;
        }
        
        .rich-text-preview em {
          font-style: italic;
          color: #e5e7eb;
        }
        
        .rich-text-preview u {
          text-decoration: underline;
        }
        
        .rich-text-preview code {
          background: #374151;
          color: #fbbf24;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-family: 'Courier New', Courier, monospace;
          font-size: 0.9em;
        }
        
        .rich-text-preview pre {
          background: #1f2937;
          color: #f9fafb;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
          border: 1px solid #374151;
        }
        
        .rich-text-preview pre code {
          background: transparent;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }
        
        .rich-text-preview blockquote {
          border-left: 4px solid #06b6d4;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #d1d5db;
          font-style: italic;
          background: rgba(6, 182, 212, 0.1);
          border-radius: 0 0.375rem 0.375rem 0;
          padding: 1rem;
        }
        
        .rich-text-preview ul {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        
        .rich-text-preview ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        
        .rich-text-preview li {
          margin: 0.5rem 0;
          color: #e5e7eb;
        }
        
        .rich-text-preview ul li {
          list-style-type: disc;
        }
        
        .rich-text-preview ol li {
          list-style-type: decimal;
        }
        
        .rich-text-preview a {
          color: #06b6d4;
          text-decoration: underline;
          cursor: pointer;
        }
        
        .rich-text-preview a:hover {
          color: #0891b2;
        }
        
        .rich-text-preview img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
          display: block;
        }
        
        .rich-text-preview mark {
          background: #fbbf24;
          color: #1f2937;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }
        
        .rich-text-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .rich-text-preview th,
        .rich-text-preview td {
          border: 1px solid #374151;
          padding: 0.75rem;
          text-align: left;
        }
        
        .rich-text-preview th {
          background: #374151;
          font-weight: 600;
          color: #ffffff;
        }
        
        .rich-text-preview td {
          background: #1f2937;
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
};

export default MarkdownPreview;