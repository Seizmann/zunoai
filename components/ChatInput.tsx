
import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowUp, Mic, MicOff, Image as ImageIcon, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string, image?: { data: string; mimeType: string }) => void;
  isLoading: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${finalTranscript}` : finalTranscript;
          });
        }
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        setSelectedImage({ data: base64, mimeType: file.type });
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      if (isListening) recognitionRef.current?.stop();
      onSendMessage(input.trim(), selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
      setImagePreview(null);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const hasSpeechSupport = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8 pt-2">
      {imagePreview && (
        <div className="mb-3 flex items-center gap-3 p-2 bg-zinc-900 border border-zinc-800 rounded-xl w-fit animate-in fade-in slide-in-from-bottom-2">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-700">
            <img src={imagePreview} alt="Selected" className="w-full h-full object-cover" />
            <button 
              onClick={removeImage}
              className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
            >
              <X size={12} />
            </button>
          </div>
          <div className="pr-2">
            <p className="text-xs font-semibold text-zinc-300">Ready to analyze</p>
            <p className="text-[10px] text-zinc-500">Add questions or instructions</p>
          </div>
        </div>
      )}

      <form 
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl focus-within:border-zinc-700 transition-all"
      >
        <div className="flex gap-1 items-center mb-1">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-all"
            title="Attach Image for Analysis"
          >
            <ImageIcon size={20} />
          </button>
          
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                isListening 
                  ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50' 
                  : 'bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
        </div>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "Listening..." : (selectedImage ? "Analyze or edit image..." : "Ask Zuno or analyze images...")}
          rows={1}
          className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 resize-none py-3 px-2 max-h-40 font-normal leading-relaxed overflow-y-auto"
        />
        
        <button
          type="submit"
          disabled={(!input.trim() && !selectedImage) || isLoading}
          className={`p-3 rounded-xl transition-all flex-shrink-0 mb-1 ${
            (!input.trim() && !selectedImage) || isLoading
              ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUp size={20} strokeWidth={3} />
          )}
        </button>
      </form>
      <p className="text-[10px] text-zinc-600 text-center mt-3 font-medium uppercase tracking-widest">
        Zuno Vision & Reasoning: Upload images for understanding or toggle Thinking Mode.
      </p>
    </div>
  );
};

export default ChatInput;
