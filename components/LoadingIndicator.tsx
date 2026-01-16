
import React from 'react';
import { Bot } from 'lucide-react';

const LoadingIndicator: React.FC = () => {
  return (
    <div className="flex w-full mb-6 justify-start animate-in fade-in duration-300">
      <div className="flex max-w-[75%] flex-row items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border bg-zinc-800 border-zinc-700 text-zinc-400">
          <Bot size={18} />
        </div>
        <div className="px-4 py-4 rounded-2xl rounded-tl-none bg-zinc-900 border border-zinc-800 flex gap-1.5 items-center">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingIndicator;
