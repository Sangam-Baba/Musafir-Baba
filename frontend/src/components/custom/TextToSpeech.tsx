"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";

interface TextToSpeechProps {
  targetId: string;
}

interface SpeechChunk {
  text: string;
  element: HTMLElement;
}

export default function TextToSpeech({ targetId }: TextToSpeechProps) {
  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chunksRef = useRef<SpeechChunk[]>([]);
  const currentChunkIndexRef = useRef<number>(0);
  const activeMarkRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      // Clean up when unmounted
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      clearHighlights();
    };
  }, []);

  const clearWordHighlight = () => {
    if (activeMarkRef.current && activeMarkRef.current.parentNode) {
      const mark = activeMarkRef.current;
      const parent = mark.parentNode;
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
      parent.normalize(); // Merge text nodes back together
    }
    activeMarkRef.current = null;
  };

  const clearHighlights = () => {
    clearWordHighlight();
    chunksRef.current.forEach(chunk => {
      if (chunk.element) {
        chunk.element.classList.remove(
          "bg-[#39FF14]/10", 
          "transition-all", 
          "duration-500", 
          "rounded-lg", 
          "ring-2", 
          "ring-[#39FF14]", 
          "shadow-[0_0_25px_rgba(57,255,20,0.5)]",
          "scale-[1.01]",
          "z-10",
          "relative"
        );
      }
    });
  };

  const highlightWord = (element: HTMLElement, charIndex: number, text: string) => {
    clearWordHighlight();

    // Find word boundaries
    const match = text.substring(charIndex).match(/^\S+/);
    if (!match) return;
    const wordLength = match[0].length;
    const targetStart = charIndex;
    const targetEnd = charIndex + wordLength;

    // Build text node map
    const textNodes: { node: Text; start: number; end: number }[] = [];
    let currentIndex = 0;
    const walk = (n: Node) => {
      if (n.nodeType === Node.TEXT_NODE) {
        const len = n.nodeValue?.length || 0;
        textNodes.push({ node: n as Text, start: currentIndex, end: currentIndex + len });
        currentIndex += len;
      } else if (n.nodeType === Node.ELEMENT_NODE) {
        for (let i = 0; i < n.childNodes.length; i++) {
          walk(n.childNodes[i]);
        }
      }
    };
    walk(element);

    // Find node for charIndex
    const startNodeInfo = textNodes.find(n => targetStart >= n.start && targetStart < n.end);
    if (!startNodeInfo) return;

    // Only highlight if the word fits entirely within the single text node (usually does)
    if (targetEnd <= startNodeInfo.end) {
      try {
        const range = document.createRange();
        range.setStart(startNodeInfo.node, targetStart - startNodeInfo.start);
        range.setEnd(startNodeInfo.node, targetEnd - startNodeInfo.start);

        const mark = document.createElement("mark");
        mark.className = "rounded-sm px-1 mx-[-2px] text-black font-extrabold relative z-20";
        mark.style.backgroundColor = "#39FF14"; // Flashy Neon Green
        mark.style.boxShadow = "0 0 10px #39FF14, 0 0 20px #39FF14, 0 0 30px #39FF14";
        mark.style.textShadow = "0 0 4px rgba(255,255,255,0.8)";
        range.surroundContents(mark);
        activeMarkRef.current = mark;
      } catch (err) {
        console.warn("Could not highlight word", err);
      }
    }
  };

  const getReadableNodes = (element: Element): HTMLElement[] => {
    const nodes: HTMLElement[] = [];
    
    const walk = (el: Element) => {
      if (
        el.tagName === 'ASIDE' || 
        el.tagName === 'NAV' || 
        el.tagName === 'BUTTON' ||
        el.classList.contains('TextToSpeech') || 
        el.classList.contains('no-tts')
      ) {
        return;
      }
      
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return;
      }

      const tagsToRead = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TH', 'TD'];
      if (tagsToRead.includes(el.tagName)) {
        if (el.textContent && el.textContent.trim().length > 0) {
          nodes.push(el as HTMLElement);
        }
        return; 
      }

      let hasDirectText = false;
      for (let i = 0; i < el.childNodes.length; i++) {
        const node = el.childNodes[i];
        if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim().length > 0) {
          hasDirectText = true;
          break;
        }
      }

      if (hasDirectText && !['UL', 'OL', 'TABLE', 'TBODY', 'TR'].includes(el.tagName)) {
         nodes.push(el as HTMLElement);
         return; 
      }

      for (let i = 0; i < el.children.length; i++) {
        walk(el.children[i]);
      }
    };
    
    walk(element);
    return nodes;
  };

  const handlePlay = () => {
    if (!synthRef.current) {
      alert("Text-to-Speech is not supported in this browser.");
      return;
    }

    if (isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.warn(`TextToSpeech: Element with id ${targetId} not found.`);
      return;
    }

    synthRef.current.cancel(); 
    clearHighlights();

    const nodes = getReadableNodes(targetElement);
    const chunks: SpeechChunk[] = [];

    nodes.forEach(node => {
      // Must preserve exact text Content (including whitespace) to ensure character offsets align perfectly
      const text = node.textContent || "";
      if (text.trim()) {
        chunks.push({ text, element: node });
      }
    });

    if (chunks.length === 0) return;

    chunksRef.current = chunks;
    currentChunkIndexRef.current = 0;
    playFromChunk(0, speed);
  };

  const playFromChunk = (startIndex: number, playSpeed: number) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    clearHighlights();

    setIsPlaying(true);
    setIsPaused(false);

    for (let i = startIndex; i < chunksRef.current.length; i++) {
      const chunk = chunksRef.current[i];
      const utterance = new SpeechSynthesisUtterance(chunk.text);
      utterance.rate = playSpeed;
      
      const voices = synthRef.current.getVoices();
      
      // Prioritize premium female English voices (like Samantha, Google UK Female, etc.)
      const preferredVoice = 
        voices.find(v => v.lang.includes("en") && (v.name.includes("Samantha") || v.name.includes("Google UK English Female") || v.name.includes("Victoria") || v.name.includes("Female"))) ||
        voices.find(v => v.lang.includes("en") && (v.name.includes("Google") || v.name.includes("Premium"))) ||
        voices.find(v => v.lang.includes("en"));
        
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        currentChunkIndexRef.current = i;
        clearHighlights(); 
        
        if (chunk.element) {
          chunk.element.classList.add(
            "bg-[#39FF14]/10", 
            "transition-all", 
            "duration-500", 
            "rounded-lg", 
            "ring-2", 
            "ring-[#39FF14]", 
            "shadow-[0_0_25px_rgba(57,255,20,0.5)]",
            "scale-[1.01]",
            "z-10",
            "relative"
          );
          
          const rect = chunk.element.getBoundingClientRect();
          const isVisible = (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
          );
          
          if (!isVisible) {
            chunk.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      };

      utterance.onboundary = (e) => {
        if (e.name === "word") {
          if (chunk.element) {
            highlightWord(chunk.element, e.charIndex, chunk.text);
          }
        }
      };

      utterance.onend = () => {
        if (chunk.element) {
          chunk.element.classList.remove(
            "bg-[#39FF14]/10", 
            "transition-all", 
            "duration-500", 
            "rounded-lg", 
            "ring-2", 
            "ring-[#39FF14]", 
            "shadow-[0_0_25px_rgba(57,255,20,0.5)]",
            "scale-[1.01]",
            "z-10",
            "relative"
          );
        }
        
        if (i === chunksRef.current.length - 1) {
          setIsPlaying(false);
          setIsPaused(false);
          currentChunkIndexRef.current = 0;
          clearWordHighlight();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== "canceled" && e.error !== "interrupted") {
          console.error("Speech synthesis error", e);
          setIsPlaying(false);
          setIsPaused(false);
          clearHighlights();
        }
      };

      synthRef.current.speak(utterance);
    }
  };

  const handlePause = () => {
    if (!synthRef.current) return;
    if (synthRef.current.speaking && !synthRef.current.paused) {
      synthRef.current.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    currentChunkIndexRef.current = 0;
    clearHighlights();
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSpeed = parseFloat(e.target.value);
    setSpeed(newSpeed);

    if (isPlaying || isPaused) {
      playFromChunk(currentChunkIndexRef.current, newSpeed);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-gray-100 shadow-lg shadow-gray-200/50 rounded-2xl px-5 py-4 mb-8 w-full max-w-2xl select-none mx-auto sm:mx-0 TextToSpeech">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0">
            <Volume2 className="w-5 h-5 text-[#FE5300]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-black text-gray-900 tracking-wide uppercase">Listen to Article</span>
            <span className="text-[11px] text-gray-500 font-medium">Audio reading with synchronized highlight</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5">
            {!isPlaying ? (
              <button 
                onClick={handlePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-[#FE5300] text-white transition-all shadow-sm"
                title="Play article"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
              </button>
            ) : (
              <button 
                onClick={handlePause}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#FE5300] hover:bg-[#e44a00] text-white transition-all shadow-sm shadow-[#FE5300]/20"
                title="Pause"
              >
                <Pause className="w-4 h-4 fill-current" />
              </button>
            )}

            {(isPlaying || isPaused) && (
              <button 
                onClick={handleStop}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                title="Stop"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            )}
          </div>

          <div className="w-px h-8 bg-gray-200 hidden sm:block mx-2" />

          <div className="flex items-center gap-3 px-1 flex-1 sm:flex-none">
            <span className="text-xs text-gray-500 font-bold w-6 text-right select-none">{speed.toFixed(1)}x</span>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={speed}
              onChange={handleSpeedChange}
              className="flex-1 sm:w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FE5300] focus:outline-none focus:ring-2 focus:ring-[#FE5300]/30"
              title="Adjust reading speed"
              style={{
                background: `linear-gradient(to right, #FE5300 0%, #FE5300 ${(speed - 0.5) / 1.5 * 100}%, #e5e7eb ${(speed - 0.5) / 1.5 * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Floating Stop Button (Visible only when playing/paused) */}
      {(isPlaying || isPaused) && (
        <button
          onClick={handleStop}
          className="fixed bottom-[150px] right-4 md:bottom-44 md:right-6 z-50 flex items-center justify-center gap-2 bg-white text-red-500 border border-red-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-5 py-3 hover:bg-red-50 transition-all hover:scale-105 active:scale-95"
          title="Stop reading"
        >
          <Square className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold tracking-wide">Stop</span>
        </button>
      )}
    </>
  );
}
