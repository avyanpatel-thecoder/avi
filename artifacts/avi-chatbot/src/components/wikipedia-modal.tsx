import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { useSearchWikipedia, getSearchWikipediaQueryKey } from "@workspace/api-client-react";

interface WikipediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string) => void;
}

export default function WikipediaModal({ isOpen, onClose, onInsert }: WikipediaModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { data: searchResults, isLoading } = useSearchWikipedia(
    { query: debouncedQuery },
    {
      query: {
        enabled: debouncedQuery.length > 2,
        queryKey: getSearchWikipediaQueryKey({ query: debouncedQuery }),
      },
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query);
  };

  const handleInsert = (title: string) => {
    onInsert(title);
    onClose();
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-gray-50 rounded-2xl border-0">
        <div className="bg-avi-gradient p-6 text-white rounded-t-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Search className="w-6 h-6" />
              Search Wikipedia
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSearch} className="mt-6 flex gap-2 relative">
            <Input
              data-testid="input-wiki-search"
              placeholder="Search for any topic..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl h-12 px-4 focus-visible:ring-white/50 text-lg"
            />
            <Button 
              type="submit" 
              className="bg-white text-primary hover:bg-gray-100 rounded-xl h-12 px-6 font-bold"
              disabled={query.length < 2 || isLoading}
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
            </Button>
          </form>
        </div>

        <div className="p-6 max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {!isLoading && debouncedQuery && (!searchResults?.results || searchResults.results.length === 0) && (
            <div className="text-center py-8 text-gray-500 font-medium">
              No results found for "{debouncedQuery}"
            </div>
          )}

          <div className="flex flex-col gap-3">
            {searchResults?.results.map((result, idx) => (
              <div 
                key={idx} 
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleInsert(result.title)}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors text-lg">
                    {result.title}
                  </h3>
                  <a 
                    href={result.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    title="Read full article"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
