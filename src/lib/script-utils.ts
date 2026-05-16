export const generateTitleFromScript = async (script: string): Promise<string> => {
  if (!script.trim()) {
    return "Untitled Video";
  }

  try {
    const response = await fetch("/api/generate-title", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script: script.trim() }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate title: ${response.status}`);
    }

    const data = await response.json();

    if (!data.title || typeof data.title !== "string") {
      throw new Error("Invalid title response format");
    }

    return data.title.trim() || "Untitled Video";
  } catch (error) {
    console.error("Error generating title with LLM:", error);

    // Fallback to simple extraction if LLM fails
    const firstSentence = script.split(/[.!?]+/)[0]?.trim();
    if (firstSentence && firstSentence.length > 0) {
      return firstSentence.length > 50 ? `${firstSentence.substring(0, 47)}...` : firstSentence;
    }

    const words = script.trim().split(/\s+/).slice(0, 6);
    return words.length > 0 ? words.join(" ") : "Untitled Video";
  }
};

export const enhanceScript = async (prompt: string): Promise<{ script: string; title: string }> => {
  if (!prompt.trim()) {
    throw new Error("Please enter a script to enhance");
  }

  try {
    const response = await fetch("/api/generate-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ script: prompt.trim() }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to enhance script: ${response.status}`);
    }

    const enhancedScript = await response.text();

    if (!enhancedScript.trim()) {
      throw new Error("Received empty enhanced script");
    }

    // Generate title from the enhanced script
    const generatedTitle = await generateTitleFromScript(enhancedScript);

    return {
      script: enhancedScript,
      title: generatedTitle,
    };
  } catch (error) {
    console.error("Script enhancement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to enhance script";
    throw error;
  }
};
