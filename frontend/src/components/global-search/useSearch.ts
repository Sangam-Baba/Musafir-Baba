import { useState, useEffect, useRef } from "react";

export interface SearchResult {
  title: string;
  url: string;
  type: string;
}

export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/search?q=${encodeURIComponent(query)}`,
          { signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setResults(data.data || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Search fetch error:", err);
          setError("Failed to fetch results");
        }
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchResults();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  return { results, isLoading, error };
}
