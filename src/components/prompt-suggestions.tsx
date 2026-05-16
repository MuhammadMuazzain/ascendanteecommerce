interface PromptSuggestion {
  text: string;
}

interface PromptSuggestionsProps {
  suggestions: PromptSuggestion[];
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
  itemClassName?: string;
}

export function PromptSuggestions({
  suggestions,
  onSuggestionClick,
  className = "",
  itemClassName = "",
}: PromptSuggestionsProps) {
  return (
    <div className={`flex flex-col gap-4 mx-8 pt-2 ${className}`}>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.text}
          onClick={() => onSuggestionClick?.(suggestion.text)}
          className={`text-foreground ${onSuggestionClick ? "cursor-pointer hover:text-foreground" : ""} ${itemClassName}`}
        >
          {suggestion.text}
        </div>
      ))}
    </div>
  );
}
