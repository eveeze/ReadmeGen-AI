"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  FileText,
  Copy,
  Download,
  Check,
  Eye,
  Code,
  Settings,
  Send,
  GitBranch,
  TestTube,
  Rocket,
  Globe,
  Package,
} from "lucide-react";
import { ReadmePreview } from "./ReadmePreview";
import {
  GenerationState,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
  ProjectAnalysis,
  AgenticQuestion,
} from "@/types";
import { LoadingSpinner } from "./LoadingSpinner";

// --- NEW COMPONENT: AnalysisSummary ---
const AnalysisSummary: React.FC<{ analysis: ProjectAnalysis }> = ({
  analysis,
}) => {
  const {
    mainLanguage,
    frameworks,
    cicdConfig,
    testConfig,
    deploymentConfig,
    apiEndpoints,
  } = analysis;

  const renderCheck = (condition: boolean | undefined) =>
    condition ? (
      <span className="text-terminal-green">✓</span>
    ) : (
      <span className="text-terminal-red">✗</span>
    );

  return (
    <div className="mt-4 p-4 border border-dashed border-border rounded bg-secondary/30 animate-fade-in">
      <h3 className="text-terminal-yellow font-bold font-mono mb-2">
        [PROJECT OVERVIEW]
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>Language:</span>
          <span className="font-bold text-foreground truncate">
            {mainLanguage}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>CI/CD:</span>
          {renderCheck(!!cicdConfig)}
          <span className="font-bold text-foreground truncate">
            {cicdConfig?.platform || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>Frameworks:</span>
          <span className="font-bold text-foreground truncate">
            {frameworks.join(", ") || "N/A"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <TestTube className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>Testing:</span>
          {renderCheck(!!testConfig)}
          <span className="font-bold text-foreground truncate">
            {testConfig?.framework || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Rocket className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>Deployment:</span>
          {renderCheck(!!deploymentConfig)}
          <span className="font-bold text-foreground truncate">
            {deploymentConfig?.platform || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span>API Endpoints:</span>
          <span className="font-bold text-foreground truncate">
            {apiEndpoints.length} detected
          </span>
        </div>
      </div>
    </div>
  );
};

interface TerminalAnalysisViewProps {
  url: string;
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  badges: Badge[];
  logoUrl: string;
  isInteractive: boolean;
  generationState: GenerationState;
  generatedReadme: string;
  questions?: AgenticQuestion[];
  onReAnalyze: () => void;
  onUrlChange: (url: string) => void;
  onTemplateChange: (template: ReadmeTemplate) => void;
  onLanguageChange: (language: ReadmeLanguage) => void;
  onLogoUrlChange: (logoUrl: string) => void;
  onInteractiveChange: (isInteractive: boolean) => void;
  onAnswerSubmit?: (answers: Record<string, string>) => void;
}

const TerminalAnalysisView: React.FC<TerminalAnalysisViewProps> = ({
  url,
  template,
  language,
  badges,
  logoUrl,
  isInteractive,
  generationState,
  generatedReadme,
  questions = [],
  onReAnalyze,
  onUrlChange,
  onTemplateChange,
  onLanguageChange,
  onLogoUrlChange,
  onInteractiveChange,
  onAnswerSubmit,
}) => {
  const [showReadme, setShowReadme] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showAnalysisSummary =
    !generationState.isLoading &&
    generationState.analysis &&
    !generatedReadme &&
    !isAnswering &&
    !(questions && questions.length > 0);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    generationState.progress,
    isAnswering,
    currentQuestionIndex,
    showAnalysisSummary,
  ]);

  useEffect(() => {
    if (isAnswering) {
      inputRef.current?.focus();
    }
  }, [isAnswering, currentQuestionIndex]);

  useEffect(() => {
    if (questions.length > 0 && !generationState.isLoading && !isAnswering) {
      setIsAnswering(true);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
    }
  }, [questions, generationState.isLoading]);

  useEffect(() => {
    if (generatedReadme && !generationState.isLoading) {
      const timer = setTimeout(() => setShowReadme(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [generatedReadme, generationState.isLoading]);

  const handleAnswerSubmit = () => {
    if (!inputValue.trim() || !onAnswerSubmit || !isAnswering) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = {
      ...userAnswers,
      [currentQuestion.question]: inputValue.trim(),
    };

    setUserAnswers(newAnswers);
    setInputValue("");

    // This direct mutation is not ideal, but we keep it to match the old code's logic
    if (generationState.progress) {
      generationState.progress.push(`$ ${inputValue.trim()}`);
    }

    if (currentQuestionIndex >= questions.length - 1) {
      setIsAnswering(false);
      onAnswerSubmit(newAnswers);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedReadme);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedReadme], { type: "text/markdown" });
    const fileUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = "README.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(fileUrl);
  };

  const handleBackToTerminal = () => {
    setShowReadme(false);
  };

  const getLinePrefix = (line: string): React.ReactElement => {
    if (line.startsWith("$"))
      return <span className="text-terminal-green mr-2 flex-shrink-0">$</span>;
    if (line.startsWith("✓"))
      return <span className="text-terminal-green mr-2 flex-shrink-0">✓</span>;
    if (line.startsWith("Error:"))
      return <span className="text-terminal-red mr-2 flex-shrink-0">✗</span>;
    return (
      <span className="text-terminal-comment mr-2 flex-shrink-0">{">"}</span>
    );
  };

  const cleanLine = (line: string): string => {
    return line.replace(/^(\$ |✓ |Error: )/, "");
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div
        className={`bg-card border-r border-border transition-all duration-300 flex flex-col ${
          showSidebar ? "w-80" : "w-12"
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2
            className={`text-lg font-bold text-terminal-green font-mono whitespace-nowrap ${
              !showSidebar && "hidden"
            }`}
          >
            Config
          </h2>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="terminal-button p-2"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        {showSidebar && (
          <div className="p-4 space-y-4 flex-1 overflow-auto">
            <div>
              <label className="block text-xs font-mono text-terminal-yellow mb-2">
                repository_url:
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => onUrlChange(e.target.value)}
                className="terminal-input w-full text-xs"
                disabled={generationState.isLoading || isAnswering}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-yellow mb-2">
                template:
              </label>
              <select
                value={template}
                onChange={(e) =>
                  onTemplateChange(e.target.value as ReadmeTemplate)
                }
                className="terminal-input w-full text-xs"
                disabled={generationState.isLoading || isAnswering}
              >
                <option value="Profesional">Professional</option>
                <option value="Dasar">Basic</option>
                <option value="Fun/Creative">Creative</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-yellow mb-2">
                language:
              </label>
              <select
                value={language}
                onChange={(e) =>
                  onLanguageChange(e.target.value as ReadmeLanguage)
                }
                className="terminal-input w-full text-xs"
                disabled={generationState.isLoading || isAnswering}
              >
                <option value="English">English</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Spanish">Spanish</option>
                <option value="Mandarin">Mandarin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-terminal-yellow mb-2">
                logo_url:
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => onLogoUrlChange(e.target.value)}
                placeholder="https://..."
                className="terminal-input w-full text-xs"
                disabled={generationState.isLoading || isAnswering}
              />
            </div>
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInteractive}
                  onChange={(e) => onInteractiveChange(e.target.checked)}
                  disabled={generationState.isLoading || isAnswering}
                  className="h-3 w-3 rounded border-border bg-input text-terminal-green"
                />
                <span className="text-xs font-mono text-terminal-comment">
                  interactive_mode
                </span>
              </label>
            </div>
            <button
              onClick={onReAnalyze}
              disabled={generationState.isLoading || !url.trim()}
              className="w-full terminal-button text-xs py-2 disabled:opacity-50"
            >
              {generationState.isLoading ? "Analyzing..." : "Re-analyze"}
            </button>
            {generatedReadme && (
              <div className="border-t border-border pt-4 space-y-2">
                <button
                  onClick={handleCopy}
                  className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
                <button
                  onClick={handleBackToTerminal}
                  className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2"
                >
                  <Terminal className="w-3 h-4" />
                  <span>Show Terminal</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {showReadme ? (
          <div className="flex-1 flex flex-col">
            <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-terminal-green" />
                <span className="text-lg font-mono text-terminal-green">
                  README.md
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-l ${
                    viewMode === "preview"
                      ? "bg-terminal-green text-background"
                      : "bg-secondary"
                  }`}
                >
                  <Eye className="w-3 h-3 inline-block mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-r ${
                    viewMode === "raw"
                      ? "bg-terminal-green text-background"
                      : "bg-secondary"
                  }`}
                >
                  <Code className="w-3 h-3 inline-block mr-1" />
                  Raw
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              {viewMode === "preview" ? (
                <ReadmePreview content={generatedReadme} />
              ) : (
                <pre className="p-8 text-sm text-foreground whitespace-pre-wrap font-mono">
                  {generatedReadme}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col terminal-window border-0 rounded-none">
            <div className="terminal-header">
              <span className="text-terminal-green font-mono text-sm">
                readmegen-analysis-log
              </span>
            </div>
            <div className="terminal-content flex-1 overflow-auto p-6 font-mono text-sm">
              {generationState.progress.map((line, index) => (
                <div key={index} className="flex">
                  {getLinePrefix(line)}
                  <span className="flex-1 whitespace-pre-wrap">
                    {cleanLine(line)}
                  </span>
                </div>
              ))}

              {showAnalysisSummary && generationState.analysis && (
                <AnalysisSummary analysis={generationState.analysis} />
              )}

              {isAnswering && currentQuestionIndex < questions.length && (
                <div className="mt-4">
                  <div className="text-terminal-yellow mb-2">{`[Q] ${questions[currentQuestionIndex].question}`}</div>
                  <div className="flex items-center space-x-2">
                    <span className="text-terminal-green">$</span>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleAnswerSubmit()
                      }
                      className="flex-1 bg-transparent border-none outline-none text-foreground font-mono"
                      placeholder={
                        questions[currentQuestionIndex].placeholder ||
                        "Your answer..."
                      }
                      disabled={generationState.isLoading}
                    />
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!inputValue.trim() || generationState.isLoading}
                      className="disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-terminal-green hover:text-terminal-cyan" />
                    </button>
                  </div>
                </div>
              )}

              {generationState.isLoading && !isAnswering && (
                <div className="flex items-center space-x-2 mt-2">
                  <LoadingSpinner variant="terminal" />
                </div>
              )}

              {generationState.error && !generationState.isLoading && (
                <div className="flex mt-2">
                  {getLinePrefix("Error:")}
                  <span className="flex-1 text-terminal-red">
                    {cleanLine(generationState.error)}
                  </span>
                </div>
              )}

              {!generationState.isLoading &&
                !isAnswering &&
                !generatedReadme && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-terminal-green">$</span>
                    <div className="w-2 h-4 bg-terminal-green animate-pulse"></div>
                  </div>
                )}
              <div ref={terminalEndRef}></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalAnalysisView;
