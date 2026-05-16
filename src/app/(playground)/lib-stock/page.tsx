"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { searchPexelsVideosAction, searchPixabayVideosAction } from "../actions";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StockPlayground() {
  const [activeTab, setActiveTab] = useState("pexels");
  const [query, setQuery] = useState("nature");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);

    try {
      let response;
      if (activeTab === "pexels") {
        response = await searchPexelsVideosAction(query);
      } else {
        response = await searchPixabayVideosAction(query);
      }

      if (response.success) {
        setResults(response.data?.videos || []);
      } else {
        toast.error(response.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Stock Search Playground</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="pexels">Pexels (Videos)</TabsTrigger>
          <TabsTrigger value="pixabay">Pixabay (Videos)</TabsTrigger>
        </TabsList>

        <div className="flex gap-4 mt-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="max-w-md"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
          {results.map((video: any) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="aspect-video relative bg-black">
                <img
                  src={
                    activeTab === "pexels"
                      ? video.image
                      : video.videos?.medium?.thumbnail || String(video.pageURL || "")
                  }
                  alt="thumb"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-1 rounded">
                  {video.duration}s
                </span>
              </div>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate">
                  {activeTab === "pexels" ? video.user : video.user}
                </p>
                <a
                  href={activeTab === "pexels" ? video.url : video.pageURL}
                  target="_blank"
                  className="text-xs text-blue-500 hover:underline"
                >
                  View Source
                </a>
              </CardContent>
            </Card>
          ))}
        </div>

        {results.length === 0 && !loading && (
          <div className="text-center text-muted-foreground mt-12">No results</div>
        )}
      </Tabs>
    </div>
  );
}
