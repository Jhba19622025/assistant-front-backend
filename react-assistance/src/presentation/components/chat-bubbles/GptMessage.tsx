// file: src/presentation/components/GptMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// Tipado local para soportar `inline` sin filtrar hacia el DOM
type CodeProps = React.ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  node?: any;
};

const CodeBlock: React.FC<CodeProps> = ({ inline, className, children, node, ...props }) => {
  if (inline) {
    return (
      <code {...props} className={`px-1 py-0.5 rounded bg-white/10 ${className ?? ''}`}>
        {children}
      </code>
    );
  }
  return (
    <pre className="p-3 rounded bg-white/10 overflow-x-auto">
      <code {...props} className={className}>
        {children}
      </code>
    </pre>
  );
};

const components: Components = {
  code: CodeBlock as Components['code'],
  a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

export const GptMessage: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="col-start-1 col-end-12 p-3">
      <div className="flex flex-row gap-3">
        {/* Borde y sombra sutil para enmarcar la respuesta */}
        <div className="flex-1 bg-white bg-opacity-5 p-4 rounded-2xl border border-white/20 shadow-sm prose prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
