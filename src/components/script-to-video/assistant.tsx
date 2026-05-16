"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpIcon, MessageCircle, Image as ImageIcon, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScriptStore } from "@/stores/script-store";
import { useVideoConfigStore } from "@/stores/video-config-store";
import { useSchemaStore } from "@/stores/schema-store";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { uploadFile } from "@/lib/upload-utils";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

interface Message {
  role: "user" | "model";
  content: string;
  status?: string;
}

interface ProductImage {
  id: string;
  name: string;
  url: string;
}

export const Assistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: session } = authClient.useSession();

  const { setScript } = useScriptStore();
  const { params, setParams } = useVideoConfigStore();
  const { schema } = useSchemaStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!session?.user?.id) {
      toast.error("Please sign in to upload images");
      return;
    }

    const toastId = toast.loading(`Uploading ${files.length} product image(s)...`);
    setIsUploadingProduct(true);

    try {
      const uploadedImages: ProductImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`File ${file.name} is not an image`);
          continue;
        }
        const result = await uploadFile(file, session.user.id);
        uploadedImages.push({
          id: crypto.randomUUID(),
          name: file.name,
          url: result.url,
        });
      }

      if (uploadedImages.length > 0) {
        const newAssets = uploadedImages.map((img) => ({
          ...img,
          type: "image",
        }));

        setParams((prev: any) => ({
          ...prev,
          productImages: [...(prev.productImages || []), ...uploadedImages],
          assets: [...(prev.assets || []), ...newAssets],
          // Keep productImage for backward compatibility with other parts of the app if needed
          productImage: prev.productImage || uploadedImages[0],
        }));

        useSchemaStore.getState().updateSchema((prev: any) => ({
          productImages: [...(prev?.productImages || []), ...uploadedImages],
          assets: [...(prev?.assets || []), ...newAssets],
          productImage: prev?.productImage || uploadedImages[0],
        }));

        toast.success(`${uploadedImages.length} image(s) added! Ready for script generation.`, {
          id: toastId,
        });
      } else {
        toast.dismiss(toastId);
      }
    } catch (error) {
      console.error("Product image error:", error);
      toast.error("Failed to upload product images", { id: toastId });
    } finally {
      setIsUploadingProduct(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeProductImage = (id: string) => {
    setParams((prev: any) => {
      const newImages = (prev.productImages || []).filter((img: ProductImage) => img.id !== id);
      const newAssets = (prev.assets || []).filter((asset: any) => asset.id !== id);
      return {
        ...prev,
        productImages: newImages,
        assets: newAssets,
        productImage: newImages[0] || undefined,
      };
    });
    useSchemaStore.getState().updateSchema((prev: any) => {
      const newImages = (prev?.productImages || []).filter((img: ProductImage) => img.id !== id);
      const newAssets = (prev?.assets || []).filter((asset: any) => asset.id !== id);
      return {
        productImages: newImages,
        assets: newAssets,
        productImage: newImages[0] || undefined,
      };
    });
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        const scrollElement = scrollRef.current?.closest("[data-radix-scroll-area-viewport]");
        if (scrollElement) {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        }
      }, 50);
    }
  }, [messages]);

  const handleSubmit = async (suggestionText?: string) => {
    const messageText = suggestionText || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      role: "model",
      content: "",
      status: "thinking",
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // 1. Trigger Async Generation
      const response = await fetch("/api/script/generate-async", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          schemaId: schema?.id,
          previousSchema: schema,
          imageUrls:
            params.productImages?.map((img: ProductImage) => img.url) ||
            (params.productImage ? [params.productImage.url] : []),
          productName: params.product?.name,
          productDescription: params.product?.description,
          visualStyle: params.visuals?.style || schema?.visuals?.style,
          scriptTone: schema?.scriptTone,
          mode: schema?.type || params.type || "character-driven-ad",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        generationId?: string;
      };

      if (!response.ok) {
        const detail =
          typeof payload.error === "string"
            ? payload.error
            : response.status === 401
              ? "Sign in required to use the assistant."
              : `Request failed (${response.status}).`;
        toast.error(detail);
        throw new Error(detail);
      }

      const generationId = payload.generationId;
      if (!generationId) {
        toast.error("Invalid response from server (missing generation id).");
        throw new Error("Invalid response from server");
      }

      // 2. Poll for Completion
      let attempts = 0;
      const maxAttempts = 30; // 60 seconds total
      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("Generation timed out");
        }
        attempts++;

        const res = await fetch(`/api/resolve-schema/${generationId}`);
        if (!res.ok) throw new Error("Failed to poll status");
        const data = await res.json();

        if (data.status === "COMPLETED") {
          const result = data.scheme;
          if (result) {
            // Apply product updates (Extracted metadata)
            if (result.productName || result.productDescription) {
              const productUpdates = {
                name: result.productName || params.product?.name || "",
                description: result.productDescription || params.product?.description || "",
              };
              setParams((prev: any) => ({ ...prev, product: productUpdates }));
              useSchemaStore.getState().updateSchema({ product: productUpdates });
            }

            // Apply script updates
            if (result.script) {
              const cleanScript = result.script.replace(/\\n/g, "\n").replace(/\n\s*\n/g, "\n\n");
              setScript(cleanScript);
              useSchemaStore.getState().updateSchema({ script: cleanScript });
            }

            // Apply block/segment updates
            if (result.segments && result.segments.length > 0) {
              // New format: character-driven ad returns segments with character objects
              setParams((prev: any) => ({ ...prev, segments: result.segments, blocks: undefined }));
              useSchemaStore
                .getState()
                .updateSchema({ segments: result.segments, blocks: undefined });
            } else if (result.blocks) {
              // Legacy format: flat blocks array (kept for backward compatibility)
              setParams((prev: any) => ({ ...prev, blocks: result.blocks }));
              useSchemaStore.getState().updateSchema({ blocks: result.blocks });
            }

            setMessages((prev) => [
              ...prev.slice(0, -1),
              {
                role: "model",
                content: result.reply || "I've updated the script and scenes for you.",
                status: "complete",
              },
            ]);
          }
          return;
        } else if (data.status === "FAILED") {
          throw new Error("AI generation failed");
        }

        // Wait 2s and poll again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return poll();
      };

      await poll();
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "model", content: "Something went wrong during generation. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground text-sm overflow-hidden border-r">
      <ScrollArea className="flex-1 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-x-hidden p-4 md:p-6 space-y-2">
          {messages.length === 0 ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
              <div className="p rounded-lg space-y-2 w-80%">
                Fresh project — describe what you want to see, or let's brainstorm about where to
                start.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300",
                    m.role === "user" ? "flex-row-reverse" : "flex-row max-w-[90%]",
                  )}
                >
                  <div
                    className={cn(
                      "flex flex-col space-y-3 w-full min-w-0",
                      m.role === "user" ? "items-end" : "items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "py-3.5 rounded-3xl text-[15px] leading-relaxed shadow-sm transition-all min-w-0 flex flex-col",
                        m.role === "user"
                          ? "bg-foreground/10 rounded-tr-none font-medium px-5"
                          : "bg-card text-card-foreground rounded-tl-none w-full px-5",
                      )}
                    >
                      <div className="w-full grid overflow-hidden">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h1: ({ className, ...props }) => (
                              <h1
                                className={cn(
                                  "scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            h2: ({ className, ...props }) => (
                              <h2
                                className={cn(
                                  "mt-8 mb-4 scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            h3: ({ className, ...props }) => (
                              <h3
                                className={cn(
                                  "mt-6 mb-4 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                            p: ({ className, ...props }) => (
                              <p className={cn("leading-7 not-first:mt-6", className)} {...props} />
                            ),
                            ul: ({ className, ...props }) => (
                              <ul
                                className={cn("my-6 ml-6 list-disc [&>li]:mt-2", className)}
                                {...props}
                              />
                            ),
                            ol: ({ className, ...props }) => (
                              <ol
                                className={cn("my-6 ml-6 list-decimal [&>li]:mt-2", className)}
                                {...props}
                              />
                            ),
                            code: ({ className, children, ...props }) => {
                              const isInline = !className?.includes("language-");
                              return (
                                <code
                                  className={cn(
                                    isInline && "bg-muted px-1.5 py-0.5 rounded font-mono text-sm",
                                    className,
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ className, ...props }) => (
                              <pre
                                className={cn(
                                  "overflow-x-auto rounded-lg bg-black p-4 text-white my-4",
                                  className,
                                )}
                                {...props}
                              />
                            ),
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4 w-full group animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col space-y-3 w-full min-w-0 items-start">
                    <div className="py-3.5 px-5 rounded-3xl text-[15px] leading-relaxed shadow-sm bg-card text-card-foreground rounded-tl-none w-fit">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
                        </div>
                        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">
                          Thinking
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 md:p-6 space-y-4 shrink-0">
        <InputGroup>
          <InputGroupTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask, Search or Chat..."
            className="min-h-11 max-h-50"
          />
          <InputGroupAddon align="block-end">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
            />
            <div className="flex items-center gap-2 max-w-75 overflow-x-auto no-scrollbar py-1">
              {params.productImages?.map((img: ProductImage) => (
                <div
                  key={img.id}
                  className="flex items-center gap-2 px-2 h-8 bg-muted/50 rounded-lg border border-border text-[10px] shrink-0 group"
                >
                  <ImageIcon className="w-3 h-3 text-primary shrink-0" />
                  <span className="max-w-20 truncate font-medium">{img.name}</span>
                  <button
                    onClick={() => removeProductImage(img.id)}
                    className="p-0.5 hover:bg-background rounded-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                    title="Remove image"
                  >
                    <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}

              {isUploadingProduct && (
                <div className="flex items-center gap-2 px-3 h-8 bg-muted/50 rounded-lg border border-border text-xs shrink-0">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                </div>
              )}

              <InputGroupButton
                variant="ghost"
                className="rounded-lg h-9 px-3 text-xs gap-1.5 font-medium shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Add Product Image"
              >
                <span className="text-base leading-none mb-0.5">+</span> Product
              </InputGroupButton>
            </div>

            <InputGroupButton
              variant="default"
              className="rounded-full ml-auto bg-foreground hover:bg-foreground/90 text-background"
              size="icon-xs"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
            >
              <ArrowUpIcon className="w-4 h-4" />
              <span className="sr-only">Send</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
};
