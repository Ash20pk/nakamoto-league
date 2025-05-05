import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownPreviewProps {
  markdown: string;
  title?: string;
  author?: string;
  readingTime?: number;
  bannerUrl?: string | null;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ 
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

export default MarkdownPreview;
