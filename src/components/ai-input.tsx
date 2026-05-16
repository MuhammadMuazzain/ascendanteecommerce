import { useState } from "react";
import { PromptInputBox } from "./prompt-input-box";
import { PromptSuggestions } from "./prompt-suggestions";
import { useIsMobile } from "@/hooks/use-mobile";

const PROMPT_SUGGESTIONS = [
  { text: "Motivational video about success" },
  {
    text: "Storytelling video: day in the life",
  },
  {
    text: "Productivity tips",
  },
  {
    text: "Fitness video",
  },
  { text: "Inspirational video with music" },
];

interface AIInputProps {
  title?: string;
  placeholder?: string;
  suggestions?: Array<{ text: string }>;
  onInputChange?: (value: string) => void;
  onSubmit?: (value: string) => void | Promise<void>;
  onSuggestionClick?: (suggestion: string) => void;
  onFolderClick?: () => void;
  className?: string;
}

export default function AIInput({
  title = "Video Magic",
  placeholder = "Ask scenify",
  suggestions = PROMPT_SUGGESTIONS,
  onInputChange,
  onSubmit,
  onSuggestionClick,
  onFolderClick,
  className = "",
}: AIInputProps) {
  const [inputValue, setInputValue] = useState("");
  const isMobile = useIsMobile();

  const handleInputChange = (value: string) => {
    setInputValue(value);
    onInputChange?.(value);
  };

  const handleSubmit = async () => {
    if (inputValue.trim()) {
      const result = onSubmit?.(inputValue);
      // Wait for async action to complete before clearing input
      if (result instanceof Promise) {
        await result;
      }
      setInputValue("");
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    onSuggestionClick?.(suggestion);
  };

  return (
    <div className={`selection-accent flex flex-col gap-6 w-full ${className}`}>
      {title && (
        <div className="sm:px-4 md:px-8 px-4 w-full flex">
          <h1 className="font-semibold text-[40px] tracking-[-2.00px] leading-[55.0px] whitespace-nowrap">
            {title}
          </h1>
        </div>
      )}
      <PromptInputBox
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onFolderClick={onFolderClick}
      />
      {!isMobile && suggestions && suggestions.length > 0 && (
        <PromptSuggestions suggestions={suggestions} onSuggestionClick={handleSuggestionClick} />
      )}
    </div>
  );
}
