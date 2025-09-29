// file: src/presentation/components/GptMessage.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

// Tipado local: evita propagar 'inline' al DOM.
type CodeProps = React.ComponentPropsWithoutRef<'code'> & { inline?: boolean; node?: any };

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
    <div className="col-start-1 col-end-12 px-2 py-1">
      <div className="flex flex-row gap-3">
        {/* Borde sólido + fondo tonal + tipografía compacta */}
        <div className="flex-1 rounded-2xl border-2 border-white/20 shadow-md
                        bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-[1px]
                        p-4 prose prose-invert max-w-none
                        prose-p:my-2 prose-headings:mt-2 prose-headings:mb-2
                        prose-ul:my-2 prose-li:my-0">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
