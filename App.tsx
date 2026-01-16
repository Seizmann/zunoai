
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, Role } from './types';
import { startChatStream, processImageTask } from './services/geminiService';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import LoadingIndicator from './components/LoadingIndicator';
import { Sparkles, MessageSquare, Trash2, Cpu, AlertCircle, Image as ImageIcon, Plus, BrainCircuit } from 'lucide-react';

const STORAGE_KEY = 'zuno_chat_history';

/**
 * Utility to apply a watermark to a base64 image
 */
const applyWatermark = (base64Data: string, mimeType: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Data);
        return;
      }

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image
      ctx.drawImage(img, 0, 0);

      // Setup watermark style
      const fontSize = Math.max(20, Math.floor(img.width / 40));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      const text = "ZUNO AI by SIJAN";
      
      // Measure text for background
      const metrics = ctx.measureText(text);
      const padding = fontSize * 0.8;
      const rectWidth = metrics.width + padding * 2;
      const rectHeight = fontSize + padding;
      
      // Draw semi-transparent background for readability at the bottom right
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(
        canvas.width - rectWidth - padding, 
        canvas.height - rectHeight - padding, 
        rectWidth, 
        rectHeight
      );

      // Draw watermark text
      ctx.fillStyle = 'white';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(
        text, 
        canvas.width - rectWidth / 2 - padding, 
        canvas.height - rectHeight / 2 - padding
      );

      // Export back to base64
      const resultBase64 = canvas.toDataURL(mimeType).split(',')[1];
      resolve(resultBase64);
    };
    img.onerror = () => resolve(base64Data);
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed: Message[] = JSON.parse(savedHistory);
        const hydratedMessages = parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(hydratedMessages);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSendMessage = async (content: string, image?: { data: string; mimeType: string }) => {
    setError(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: content || (image ? "Analyze this image" : ""),
      timestamp: new Date(),
      image,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const modelMessageId = (Date.now() + 1).toString();

      // HEURISTIC: Use 2.5 Flash Image only if specific "edit" keywords are detected in a non-thinking session.
      // Otherwise, use 3 Pro for analysis/reasoning as requested.
      const isEditRequest = image && !isThinking && /filter|add|remove|change|replace|edit|make/i.test(content);

      if (isEditRequest && image) {
        // Nano banana image editing task (Gemini 2.5 Flash Image)
        const response = await processImageTask(content || "Process this image", image);
        
        let finalImage = response.image;
        if (finalImage) {
          const watermarkedData = await applyWatermark(finalImage.data, finalImage.mimeType);
          finalImage = { ...finalImage, data: watermarkedData };
        }

        const modelMessage: Message = {
          id: modelMessageId,
          role: Role.MODEL,
          content: response.text,
          timestamp: new Date(),
          image: finalImage || undefined,
        };
        setMessages(prev => [...prev, modelMessage]);
      } else {
        // Chat Understanding or Thinking (Gemini 3 Pro/Flash Preview)
        let streamContent = "";
        const initialModelMessage: Message = {
          id: modelMessageId,
          role: Role.MODEL,
          content: "",
          timestamp: new Date(),
        };

        const historyForAPI = [...messages, userMessage];
        setMessages(prev => [...prev, initialModelMessage]);
        setIsStreaming(true);
        setIsLoading(false); 

        await startChatStream(
          historyForAPI.slice(0, -1), 
          content || "Analyze the uploaded content", 
          (chunk) => {
            streamContent += chunk;
            setMessages(prev => 
              prev.map(msg => 
                msg.id === modelMessageId 
                  ? { ...msg, content: streamContent } 
                  : msg
              )
            );
          },
          { thinking: isThinking, image: image }
        );
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      setError(err.message || "An unexpected error occurred.");
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: Role.MODEL,
        content: `**Error:** ${err.message || "I'm having trouble processing that request. Please try again."}`,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === Role.MODEL && lastMsg.content === "") {
          return [...prev.slice(0, -1), errorMessage];
        }
        return [...prev, errorMessage];
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length === 0) return;
    if (confirm("Start a new chat? Current history will be cleared.")) {
      setMessages([]);
      setError(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <Cpu className="text-black" size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg tracking-tight">Zuno <span className="text-zinc-500 font-medium">AI</span></h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Connected</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsThinking(!isThinking)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isThinking 
                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Thinking Mode (Pro)"
          >
            <BrainCircuit size={16} />
            <span className="hidden sm:inline">Thinking Mode</span>
          </button>

          <button 
            onClick={handleNewChat}
            disabled={messages.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)]"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <button 
            onClick={handleNewChat}
            disabled={messages.length === 0}
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-0"
            title="Clear Chat History"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-grow overflow-y-auto px-4 md:px-0 scroll-smooth">
        <div className="max-w-4xl mx-auto py-8">
          {messages.length === 0 ? (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
              <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <Sparkles size={40} className="text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold mb-3 tracking-tight">Hello, I'm Zuno.</h2>
              <p className="text-zinc-500 max-w-sm mx-auto text-sm">
                Advanced AI powered by Gemini 3. {isThinking ? "Thinking mode active." : "Deeply analytical."}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-12 w-full max-w-lg">
                {[
                  { icon: <ImageIcon size={16} />, text: "Upload a photo and ask 'What is in this image?'" },
                  { icon: <BrainCircuit size={16} />, text: "Enable Thinking Mode for complex coding help" },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.text)}
                    className="flex items-center gap-3 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl transition-all text-sm text-zinc-300 text-left"
                  >
                    <span className="text-zinc-500">{item.icon}</span>
                    {item.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isLoading && <LoadingIndicator />}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent pt-4 pb-2">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || isStreaming} />
        <div className="text-center pb-4">
          <p className="text-[11px] text-zinc-600 font-medium tracking-wide">
            Developed by <a href="https://fb.com/fakesijan" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors hover:underline decoration-zinc-700 underline-offset-4">Mohammad Sijan</a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
