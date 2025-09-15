"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Copy,
  Download,
  Eye,
  Code,
  Check,
  FileText,
  Github,
  Terminal,
  Maximize2,
  Minimize2,
  X,
  ExternalLink,
} from "lucide-react";

interface ReadmePreviewProps {
  content: string;
}

export const ReadmePreview: React.FC<ReadmePreviewProps> = ({ content }) => {
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<string | null>(null); // 1. Inisialisasi dengan null

  // 2. Gunakan useEffect untuk mengatur waktu hanya di sisi klien
  useEffect(() => {
    // Atur waktu awal saat komponen pertama kali di-mount di klien
    setCurrentTime(new Date().toLocaleTimeString());

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Dependensi kosong memastikan ini hanya berjalan sekali di klien

  // ... (sisa dari useEffect untuk markdown processing tetap sama)
  useEffect(() => {
    if (viewMode === "preview" && previewRef.current) {
      // Handle Mermaid diagrams
      const mermaidBlocks =
        previewRef.current.querySelectorAll(".mermaid-block");
      mermaidBlocks.forEach((block) => {
        const mermaidContent = block.textContent || "";
        block.innerHTML = `
          <div class="mermaid-preview-terminal relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-terminal-green to-transparent"></div>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-terminal-green/20 border border-terminal-green rounded flex items-center justify-center">
                  <svg class="w-4 h-4 text-terminal-green" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                  </svg>
                </div>
                <div>
                  <div class="text-sm font-bold text-terminal-yellow font-mono">[DIAGRAM] Architecture Flow</div>
                  <div class="text-xs text-terminal-comment font-mono">mermaid.js rendering</div>
                </div>
              </div>
            </div>
            <div class="mermaid-code-terminal">
${mermaidContent}
            </div>
            <div class="mt-3 flex items-center justify-between text-xs">
              <div class="flex items-center space-x-2 text-terminal-cyan font-mono">
                <div class="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
                <span>interactive flowchart on github</span>
              </div>
              <div class="text-terminal-comment bg-secondary px-2 py-1 rounded font-mono border border-border">
                mermaid.js
              </div>
            </div>
          </div>
        `;
      });

      // Handle regular code blocks
      const codeBlocks = previewRef.current.querySelectorAll(".code-block");
      codeBlocks.forEach((block) => {
        const lang = block.getAttribute("data-lang") || "";
        const codeElement = block.querySelector("code");
        if (codeElement) {
          const codeContent = codeElement.textContent || "";
          block.innerHTML = `
            <div class="terminal-window my-6">
              ${
                lang && lang !== "text"
                  ? `
                <div class="terminal-header">
                  <div class="terminal-controls">
                    <div class="terminal-dot close"></div>
                    <div class="terminal-dot minimize"></div>
                    <div class="terminal-dot maximize"></div>
                  </div>
                  <div class="terminal-title">${lang.toLowerCase()}.sh</div>
                  <div class="terminal-stats">${
                    codeContent.split("\\n").length
                  } lines</div>
                </div>
              `
                  : ""
              }
              <div class="terminal-content">
                <pre class="text-sm text-foreground"><code>${codeContent}</code></pre>
              </div>
            </div>
          `;
        }
      });
    }
  }, [content, viewMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy content:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Enhanced markdown processing for terminal theme
  const processMarkdown = (text: string) => {
    return (
      text
        // Handle Mermaid blocks first
        .replace(
          /```mermaid\n([\s\S]*?)\n```/g,
          '<div class="mermaid-block">$1</div>'
        )

        // Handle other code blocks
        .replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
          const language = lang || "text";
          return `<div class="code-block" data-lang="${language}"><code>${code}</code></div>`;
        })

        // Headers with terminal styling
        .replace(
          /^#### (.*$)/gim,
          '<h4 class="text-lg font-bold mt-6 mb-3 text-terminal-blue font-mono">▸ $1</h4>'
        )
        .replace(
          /^### (.*$)/gim,
          '<h3 class="text-xl font-bold mt-8 mb-4 text-terminal-cyan font-mono">▶ $1</h3>'
        )
        .replace(
          /^## (.*$)/gim,
          '<h2 class="text-2xl font-bold mt-10 mb-6 text-terminal-yellow font-mono border-b border-border pb-3">█ $1</h2>'
        )
        .replace(
          /^# (.*$)/gim,
          '<h1 class="text-3xl font-bold mt-8 mb-8 text-terminal-green font-mono border-b-2 border-primary pb-4">▓ $1</h1>'
        )

        // Enhanced badge handling
        .replace(
          /\[\!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
          '<a href="$3" target="_blank" rel="noopener noreferrer" class="readme-badge inline-block mr-2 mb-2 transition-transform hover:scale-105 terminal-glow"><img src="$2" alt="$1" class="inline-block rounded-sm shadow-sm border border-border" style="max-height: 20px;" /></a>'
        )

        // Terminal-styled links
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-terminal-blue hover:text-terminal-cyan underline decoration-2 underline-offset-2 transition-colors font-mono">[$1]</a>'
        )

        // Text formatting with terminal colors
        .replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-bold text-terminal-green font-mono">$1</strong>'
        )
        .replace(
          /\*(.*?)\*/g,
          '<em class="italic text-terminal-cyan font-mono">$1</em>'
        )
        .replace(
          /~~(.*?)~~/g,
          '<del class="line-through text-terminal-comment font-mono">$1</del>'
        )

        // Inline code with terminal styling
        .replace(
          /`([^`]+)`/g,
          '<code class="bg-secondary text-terminal-green px-2 py-1 rounded-sm text-sm font-mono border border-border">$1</code>'
        )

        // Lists with terminal bullets
        .replace(
          /^[\s]*[-*+] (.*$)/gim,
          '<li class="ml-6 mb-2 text-foreground font-mono list-none relative"><span class="absolute -left-4 text-terminal-green">▸</span>$1</li>'
        )
        .replace(
          /^[\s]*\d+\. (.*$)/gim,
          '<li class="ml-6 mb-2 text-foreground font-mono list-none relative"><span class="absolute -left-6 text-terminal-yellow font-bold w-4 text-right">$.</span>$1</li>'
        )

        // Terminal-styled blockquotes
        .replace(
          /^> (.*$)/gim,
          '<blockquote class="border-l-4 border-terminal-blue bg-secondary/50 pl-4 italic text-muted-foreground my-6 py-4 rounded-r font-mono relative"><span class="absolute -left-1 text-terminal-blue text-2xl leading-none">▐</span>$1</blockquote>'
        )

        // Terminal horizontal rules
        .replace(
          /^---$/gm,
          '<hr class="my-8 border-0 h-px bg-gradient-to-r from-transparent via-terminal-green to-transparent">'
        )

        // Tables with terminal styling
        .replace(/\|(.+)\|/g, (match) => {
          const cells = match.split("|").filter((cell) => cell.trim() !== "");
          const cellsHtml = cells
            .map(
              (cell) =>
                `<td class="border border-border px-4 py-2 text-sm font-mono bg-card hover:bg-secondary/50 transition-colors">${cell.trim()}</td>`
            )
            .join("");
          return `<tr class="hover:bg-secondary/30">${cellsHtml}</tr>`;
        })

        // Paragraph breaks with proper spacing
        .replace(
          /\n\n/g,
          '</p><p class="mb-4 text-foreground leading-relaxed font-mono">'
        )
        .replace(/\n/g, "<br>")
    );
  };

  const processedHtml = processMarkdown(content);
  const stats = {
    characters: content.length,
    lines: content.split("\n").length,
    words: content.split(/\s+/).filter((word) => word.length > 0).length,
  };

  return (
    <div
      className={`mx-auto animate-slide-up ${
        isMaximized ? "fixed inset-4 z-50" : "max-w-6xl"
      }`}
    >
      <div className="terminal-window bg-card shadow-2xl border border-border backdrop-blur-sm">
        {/* Terminal Header */}
        <div className="terminal-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              {/* Terminal controls */}
              <div className="terminal-controls">
                <button
                  className="terminal-dot close hover:brightness-110 transition-all"
                  onClick={() => setIsMaximized(false)}
                >
                  <X className="w-2 h-2 text-background" />
                </button>
                <button
                  className="terminal-dot minimize hover:brightness-110 transition-all"
                  onClick={() => setIsMaximized(!isMaximized)}
                >
                  <Minimize2 className="w-2 h-2 text-background" />
                </button>
                <button
                  className="terminal-dot maximize hover:brightness-110 transition-all"
                  onClick={() => setIsMaximized(!isMaximized)}
                >
                  <Maximize2 className="w-2 h-2 text-background" />
                </button>
              </div>

              {/* File info */}
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-terminal-green/20 border border-terminal-green rounded">
                  <FileText className="w-4 h-4 text-terminal-green" />
                </div>
                <div>
                  <div className="text-sm font-bold text-terminal-green font-mono">
                    ~/projects/README.md
                  </div>
                  <div className="text-xs text-terminal-comment font-mono">
                    {stats.words}w • {stats.lines}l • {stats.characters}c
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal info */}
            <div className="flex items-center space-x-4">
              <div className="text-xs text-terminal-comment font-mono">
                {currentTime}
              </div>
              <div className="flex items-center bg-secondary rounded border border-border">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-l transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === "preview"
                      ? "bg-terminal-green text-background shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>preview</span>
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-r transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === "raw"
                      ? "bg-terminal-green text-background shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Code className="w-3 h-3" />
                  <span>raw</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className={`terminal-button flex items-center space-x-2 px-3 py-1.5 text-xs transition-all duration-200 ${
                  copied
                    ? "success"
                    : "hover:bg-terminal-blue hover:text-background hover:border-terminal-blue"
                }`}
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copied ? "copied!" : "copy"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="terminal-button flex items-center space-x-2 px-3 py-1.5 text-xs hover:bg-terminal-cyan hover:text-background hover:border-terminal-cyan transition-all duration-200"
              >
                <Download className="w-3 h-3" />
                <span>save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="terminal-content bg-background relative">
          <div
            className={`overflow-auto ${
              isMaximized ? "max-h-[calc(100vh-12rem)]" : "max-h-[80vh]"
            } min-h-[500px]`}
          >
            {viewMode === "preview" ? (
              <div
                ref={previewRef}
                className="readme-preview-terminal p-8 max-w-none"
                dangerouslySetInnerHTML={{
                  __html: `<div class="mb-4 text-foreground font-mono leading-relaxed">${processedHtml}</div>`,
                }}
              />
            ) : (
              <div className="relative bg-background">
                {/* Terminal prompt header */}
                <div className="sticky top-0 bg-secondary px-6 py-3 border-b border-border flex items-center justify-between font-mono">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-xs text-terminal-comment">
                      <Terminal className="w-4 h-4 text-terminal-green" />
                      <span>user@readmegen:~/project$</span>
                      <span className="text-terminal-yellow">
                        cat README.md
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-terminal-comment">
                    {stats.lines} lines | {stats.words} words |{" "}
                    {stats.characters} chars
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-8 text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed min-h-full bg-background">
                    <span className="text-terminal-green">$</span>{" "}
                    <span className="text-terminal-yellow">cat README.md</span>
                    {"\n"}
                    <span className="text-terminal-comment"># Output:</span>
                    {"\n\n"}
                    {content}
                    {"\n\n"}
                    <span className="text-terminal-green">$</span>{" "}
                    <span className="terminal-cursor">_</span>
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Terminal Footer */}
        <div className="terminal-header border-t border-border bg-secondary/50">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4 text-xs text-terminal-comment font-mono">
              <div className="flex items-center space-x-2">
                <Github className="w-3 h-3 text-terminal-green" />
                <span>github.com compatible</span>
              </div>
              <div className="w-px h-3 bg-border"></div>
              <div>markdown v1.0.1</div>
              <div className="w-px h-3 bg-border"></div>
              <div>utf-8 encoded</div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-terminal-comment font-mono">
              <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
              <span>generated with readmegen.ai</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
