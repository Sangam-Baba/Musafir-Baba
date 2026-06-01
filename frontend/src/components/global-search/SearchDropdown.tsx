import React from "react";
import Link from "next/link";
import { SearchResult } from "./useSearch";
import { Loader2, Search, MapPin, Map, FileText, File, ExternalLink, Globe, Car, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SearchDropdownProps {
  isOpen: boolean;
  isLoading: boolean;
  results: SearchResult[];
  query: string;
  onClose: () => void;
  onSelect: (result: SearchResult) => void;
  selectedIndex: number;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "Package":
    case "Customized Package":
      return <Map className="w-4 h-4 text-orange-500" />;
    case "Destination":
      return <MapPin className="w-4 h-4 text-green-500" />;
    case "Blog":
    case "News":
      return <FileText className="w-4 h-4 text-pink-500" />;
    case "Visa":
      return <Briefcase className="w-4 h-4 text-indigo-500" />;
    case "WebPage":
    case "SEO Page":
    case "About Us":
      return <Globe className="w-4 h-4 text-blue-500" />;
    case "Category":
      return <File className="w-4 h-4 text-purple-500" />;
    case "Vehicle":
      return <Car className="w-4 h-4 text-yellow-600" />;
    default:
      return <ExternalLink className="w-4 h-4 text-gray-500" />;
  }
};

const highlightText = (text: string, highlight: string) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlight})`, "gi");
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} className="font-bold text-[#FE5300]">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export default function SearchDropdown({
  isOpen,
  isLoading,
  results,
  query,
  onSelect,
  selectedIndex,
}: SearchDropdownProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute top-full left-0 right-0 mt-3 bg-white/98 backdrop-blur-xl rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100/80 z-50 flex flex-col max-h-[400px]"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="w-8 h-8 text-[#FE5300] animate-spin" />
              <p className="text-sm text-gray-500">Searching all experiences...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-y-auto overflow-x-hidden p-1.5 hide-scrollbar">
              {results.map((result, index) => (
                <div
                  key={`${result.url}-${index}`}
                  onClick={() => onSelect(result)}
                  className={`flex items-center justify-between p-2 md:p-2.5 rounded-xl cursor-pointer transition-all duration-200 group ${
                    index === selectedIndex
                      ? "bg-gray-50 pl-4"
                      : "hover:bg-gray-50 hover:pl-4"
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4 overflow-hidden w-full">
                    <div className="shrink-0 text-gray-400 group-hover:text-gray-500 transition-colors">
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex flex-col truncate w-full pr-2">
                      <span className="text-[13px] md:text-sm font-medium text-gray-700 truncate tracking-tight">
                        {highlightText(result.title, query)}
                      </span>
                      <span className="text-[10px] md:text-[11px] text-gray-400 truncate tracking-tight">
                        {result.url}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded bg-slate-50 text-slate-400 border border-slate-100/50">
                      {result.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <Search className="w-10 h-10 text-gray-200" />
              <p className="text-gray-500 font-medium">No results found</p>
              <p className="text-xs text-gray-400">Try adjusting your search</p>
            </div>
          ) : null}
          
          {/* Footer branding / info */}
          {results.length > 0 && (
            <div className="bg-slate-50/50 p-2 text-center border-t border-slate-100 shrink-0 rounded-b-2xl">
              <span className="text-[9px] md:text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                Press Enter to select • Use arrows to navigate
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
