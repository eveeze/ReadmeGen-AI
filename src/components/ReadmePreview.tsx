"use client";

import { useState, useEffect } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import type { ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, Code2, Eye } from "lucide-react";
import mermaid from "mermaid";
import { HTMLAttributes } from "react";

interface ReadmePreviewProps {
  content: string;
}

type CodeProps = HTMLAttributes<HTMLElement> &
  ExtraProps & {
    inline?: boolean;
  };

mermaid.initialize({ startOnLoad: false, theme: "default" });

export function ReadmePreview({ content }: ReadmePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");

  useEffect(() => {
    if (viewMode === "preview") {
      // Find all potential mermaid diagrams and render them
      const mermaidElements = document.querySelectorAll(".mermaid");
      if (mermaidElements.length > 0) {
        try {
          mermaid.run({ nodes: mermaidElements as NodeListOf<HTMLElement> });
        } catch (error) {
          console.error("Mermaid rendering error:", error);
          // Optionally, display an error message in the UI for each failed diagram
          mermaidElements.forEach((el) => {
            if (!el.getAttribute("data-processed")) {
              el.innerHTML = `<div style="color: red; border: 1px solid red; padding: 10px; border-radius: 5px;">Error rendering diagram. Check console for details.</div>`;
            }
          });
        }
      }
    }
  }, [content, viewMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const markdownComponents: Components = {
    code: ({ node, inline, className, children, ...props }: CodeProps) => {
      const match = /language-(\w+)/.exec(className || "");

      if (!inline && match && match[1] === "mermaid") {
        return <div className="mermaid">{String(children).trim()}</div>;
      }

      return !inline && match ? (
        <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto mb-4 border border-gray-200 dark:border-gray-700">
          <code
            className="block text-gray-800 dark:text-gray-200 font-mono text-sm"
            {...props}
          >
            {children}
          </code>
        </pre>
      ) : (
        <code
          className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-gray-700"
          {...props}
        >
          {children}
        </code>
      );
    },
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">
        {children}
      </h3>
    ),
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Generated README.md
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={() => setViewMode("preview")}
              className={`flex items-center px-3 py-1 text-sm rounded-md transition-all ${
                viewMode === "preview"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Eye className="w-4 h-4 mr-1" />
              Preview
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`flex items-center px-3 py-1 text-sm rounded-md transition-all ${
                viewMode === "raw"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Code2 className="w-4 h-4 mr-1" />
              Raw
            </button>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center px-3 py-1 text-sm rounded-md border transition-all ${
              copied
                ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
      <div className="p-6">
        {viewMode === "preview" ? (
          <div className="prose prose-lg prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap font-mono">
              {content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
