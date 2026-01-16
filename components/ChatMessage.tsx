
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message } from '../types';
import { User, Bot, Copy, Check, Download, ExternalLink } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const imageUrl = message.image 
    ? `data:${message.image.mimeType};base64,${message.image.data}` 
    : null;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
          isUser 
            ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
            : 'bg-zinc-800 border-zinc-700 text-zinc-400'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-1 overflow-hidden">
          <div className={`relative group px-4 py-3 rounded-2xl border ${
            isUser 
              ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-100 rounded-tl-none'
          }`}>
            
            {imageUrl && (
              <div className="mb-3 relative group/img rounded-xl overflow-hidden border border-white/10 shadow-lg">
                <img src={imageUrl} alt="Message Content" className="max-w-full h-auto rounded-lg block" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a 
                    href={imageUrl} 
                    download="zuno-generated-image.png" 
                    className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white transition-all"
                  >
                    <Download size={16} />
                  </a>
                  <a 
                    href={imageUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-lg text-white transition-all"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            )}

            <div className="prose prose-invert prose-sm max-w-none break-words">
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <ReactMarkdown
                  components={{
                    pre: ({node, ...props}) => (
                      <div className="relative my-2 overflow-auto bg-black/40 rounded-lg p-3 font-mono text-xs border border-white/5">
                        <pre {...props} />
                      </div>
                    ),
                    code: ({node, ...props}) => (
                      <code className="bg-zinc-800 px-1 rounded text-cyan-300 font-mono" {...props} />
                    ),
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-4 mb-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-4 mb-2" {...props} />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>

            {!isUser && message.content && (
              <button 
                onClick={handleCopy}
                className="absolute -right-10 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-zinc-300 bg-zinc-900/50 rounded-lg"
                title="Copy message"
              >
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              </button>
            )}
          </div>
          
          <span className={`text-[10px] text-zinc-500 font-medium ${isUser ? 'text-right' : 'text-left'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
