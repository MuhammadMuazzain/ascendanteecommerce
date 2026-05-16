"use client";

import { useState } from "react";
import { triggerRepurposeAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Loader2, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ViralEditPlayground() {
  const [loading, setLoading] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [url, setUrl] = useState(
    "https://live.kalocdn.com/video/7584490494177152287.mp4?key=619e635cfb3584f0daea1fd845a5929e&time=1776295487598",
  );
  const [name, setName] = useState("my product");
  const [productName, setProductName] = useState("ToePlex Magnesium");

  const handleTrigger = async () => {
    setLoading(true);
    try {
      const result = await triggerRepurposeAction(url, name, productName);
      if (result.success) {
        toast.success("Orchestrator triggered successfully!");
        setTriggered(true);
      } else {
        toast.error(`Error: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-12 space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-br from-primary to-primary-foreground bg-clip-text text-transparent">
          Viral Edit Playground
        </h1>
        <p className="text-xl text-muted-foreground">
          Trigger professional AI video analysis and review step-by-step logic.
        </p>
      </div>

      <Card className="border-2 shadow-2xl bg-card/40 backdrop-blur-md overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        <CardHeader>
          <CardTitle className="text-2xl">Initialize Edit Flow</CardTitle>
          <CardDescription className="text-md">
            The orchestrator will run Gemini analysis and generate Remotion-ready scene JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Video Source URL
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="h-12 bg-background/50 border-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Internal Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Viral Summer Product"
              className="h-12 bg-background/50 border-primary/20 focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Product Name
            </label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. ToePlex Magnesium"
              className="h-12 bg-background/50 border-primary/20 focus:border-primary transition-colors"
            />
          </div>

          <Button
            onClick={handleTrigger}
            disabled={loading}
            className="w-full h-14 text-xl font-bold transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-primary/20"
          >
            {loading ? (
              <>
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Processing...
              </>
            ) : triggered ? (
              <>
                <CheckCircle2 className="mr-3 h-6 w-6 text-green-400" />
                Analysis Started
              </>
            ) : (
              <>
                <Play className="mr-3 h-6 w-6 fill-current" />
                Trigger Orchestrator
              </>
            )}
          </Button>

          {triggered && (
            <div className="p-5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-100 text-md animate-in fade-in zoom-in-95 duration-500">
              <p className="font-bold mb-1">🚀 Success!</p>
              <p className="opacity-90">
                The event has been dispatched to Inngest. Monitor your terminal output to see each
                step returning its output JSON.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card/20 border-primary/10 shadow-inner">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div
                className={`h-4 w-4 rounded-full ${triggered ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse" : "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]"}`}
              />
              <span className="text-lg font-medium">
                {triggered ? "Live Task Running" : "Ready for Input"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/20 border-primary/10 shadow-inner">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground">
              Review Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
              Database persistence is currently{" "}
              <span className="text-white font-bold">DISABLED</span>. Review JSON results in logs.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
