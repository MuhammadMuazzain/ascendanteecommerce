import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="text-3xl font-bold mb-6 text-foreground">{children}</h1>,
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-medium mt-6 mb-3 text-foreground">{children}</h3>
    ),
    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => <li className="pl-1">{children}</li>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-foreground hover:underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    ...components,
  };
}
