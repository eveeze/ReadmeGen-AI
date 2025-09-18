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
  ChevronLeft,
  ChevronRight,
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

// --- ANALYSIS SUMMARY COMPONENT ---
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
      <h3 className="text-terminal-yellow font-bold font-mono mb-3">
        [PROJECT OVERVIEW]
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">Language:</span>
          <span className="font-bold text-foreground truncate">
            {mainLanguage}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <GitBranch className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">CI/CD:</span>
          {renderCheck(!!cicdConfig)}
          <span className="font-bold text-foreground truncate">
            {cicdConfig?.platform || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Code className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">Frameworks:</span>
          <span className="font-bold text-foreground truncate">
            {frameworks.length > 0 ? frameworks.join(", ") : "N/A"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <TestTube className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">Testing:</span>
          {renderCheck(!!testConfig)}
          <span className="font-bold text-foreground truncate">
            {testConfig?.framework || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Rocket className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">Deployment:</span>
          {renderCheck(!!deploymentConfig)}
          <span className="font-bold text-foreground truncate">
            {deploymentConfig?.platform || "Not Detected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-terminal-cyan flex-shrink-0" />
          <span className="text-terminal-comment">API Endpoints:</span>
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

  // Reset showReadme when generation starts
  useEffect(() => {
    if (generationState.isLoading) {
      setShowReadme(false);
    }
  }, [generationState.isLoading]);

  // Reset question state when new analysis starts
  useEffect(() => {
    if (generationState.isLoading) {
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setInputValue("");
      setIsAnswering(false);
    }
  }, [generationState.isLoading]);

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

  // Enhanced handleReAnalyze that resets all states
  const handleReAnalyzeClick = () => {
    // Reset all local states
    setShowReadme(false);
    setViewMode("preview");
    setCopied(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setInputValue("");
    setIsAnswering(false);

    // Call the parent's re-analyze function
    onReAnalyze();
  };

  const handleAnswerSubmit = () => {
    if (!inputValue.trim() || !onAnswerSubmit || !isAnswering) return;

    const currentQuestion = questions[currentQuestionIndex];
    const newAnswers = {
      ...userAnswers,
      [currentQuestion.question]: inputValue.trim(),
    };

    setUserAnswers(newAnswers);
    setInputValue("");

    // Add user response to progress
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

  const handleShowReadme = () => {
    setShowReadme(true);
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
    <div className="h-full bg-background text-foreground flex overflow-hidden">
      {/* Sidebar - Always visible and responsive */}
      <div
        className={`bg-card border-r border-border transition-all duration-300 flex flex-col flex-shrink-0 ${
          showSidebar ? "w-80" : "w-16"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2
            className={`text-lg font-bold text-terminal-green font-mono whitespace-nowrap transition-opacity ${
              !showSidebar ? "opacity-0" : "opacity-100"
            }`}
          >
            Configuration
          </h2>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="terminal-button p-2 hover:bg-secondary rounded"
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Sidebar Content */}
        {showSidebar && (
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
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
                onClick={handleReAnalyzeClick}
                disabled={generationState.isLoading || !url.trim()}
                className="w-full terminal-button text-xs py-2 disabled:opacity-50 hover:bg-terminal-green hover:text-background"
              >
                {generationState.isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 border border-background border-t-transparent rounded-full animate-spin"></div>
                    <span>Re-analyzing...</span>
                  </div>
                ) : (
                  "Re-analyze"
                )}
              </button>
            </div>

            {/* Action buttons - Only show when README is generated */}
            {generatedReadme && (
              <div className="border-t border-border pt-4 mt-6 space-y-2">
                <button
                  onClick={handleCopy}
                  className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2 hover:bg-terminal-blue hover:text-background"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? "Copied!" : "Copy README"}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2 hover:bg-terminal-cyan hover:text-background"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>

                {/* Toggle between Terminal and Preview */}
                {showReadme ? (
                  <button
                    onClick={handleBackToTerminal}
                    className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2 hover:bg-terminal-yellow hover:text-background"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Show Terminal</span>
                  </button>
                ) : (
                  <button
                    onClick={handleShowReadme}
                    className="w-full terminal-button text-xs py-2 flex items-center justify-center space-x-2 hover:bg-terminal-magenta hover:text-background"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Show Preview</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area - Improved layout */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {showReadme ? (
          /* README View */
          <div className="flex-1 flex flex-col h-full">
            {/* README Header */}
            <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-terminal-green" />
                <span className="text-lg font-mono text-terminal-green">
                  README.md
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-l transition-colors ${
                    viewMode === "preview"
                      ? "bg-terminal-green text-background"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <Eye className="w-3 h-3 inline-block mr-1" />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`px-3 py-1.5 text-xs font-mono rounded-r transition-colors ${
                    viewMode === "raw"
                      ? "bg-terminal-green text-background"
                      : "bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <Code className="w-3 h-3 inline-block mr-1" />
                  Raw
                </button>
                {/* Back to Terminal button in header for easy access */}
                <button
                  onClick={handleBackToTerminal}
                  className="ml-2 terminal-button text-xs py-1.5 px-3 flex items-center space-x-1 hover:bg-terminal-yellow hover:text-background"
                >
                  <Terminal className="w-3 h-3" />
                  <span>Terminal</span>
                </button>
              </div>
            </div>

            {/* README Content */}
            <div className="flex-1 overflow-auto">
              {viewMode === "preview" ? (
                <ReadmePreview content={generatedReadme} />
              ) : (
                <pre className="p-8 text-sm text-foreground whitespace-pre-wrap font-mono h-full bg-secondary/20">
                  {generatedReadme}
                </pre>
              )}
            </div>
          </div>
        ) : (
          /* Terminal View - Improved styling */
          <div className="flex-1 flex flex-col bg-card">
            {/* Terminal Header */}
            <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-terminal-red"></div>
                  <div className="w-3 h-3 rounded-full bg-terminal-yellow"></div>
                  <div className="w-3 h-3 rounded-full bg-terminal-green"></div>
                </div>
                <span className="text-terminal-green font-mono text-sm">
                  readmegen-analysis-log
                </span>
              </div>
              <div className="flex items-center space-x-4">
                {/* Show Preview button in terminal header when README is ready */}
                {generatedReadme && (
                  <button
                    onClick={handleShowReadme}
                    className="terminal-button text-xs py-1.5 px-3 flex items-center space-x-1 hover:bg-terminal-magenta hover:text-background"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>
                )}
                <div className="text-xs text-terminal-comment font-mono">
                  Terminal Session Active
                </div>
              </div>
            </div>

            {/* Terminal Content - Better spacing and readability */}
            <div className="flex-1 overflow-auto bg-background/95 font-mono text-sm">
              <div className="p-6 space-y-1">
                {generationState.progress.map((line, index) => (
                  <div key={index} className="flex items-start group">
                    {getLinePrefix(line)}
                    <span className="flex-1 whitespace-pre-wrap leading-relaxed">
                      {cleanLine(line)}
                    </span>
                  </div>
                ))}

                {showAnalysisSummary && generationState.analysis && (
                  <AnalysisSummary analysis={generationState.analysis} />
                )}

                {/* Interactive Question Input */}
                {isAnswering && currentQuestionIndex < questions.length && (
                  <div className="mt-6 p-4 bg-secondary/30 border border-terminal-blue/30 rounded">
                    <div className="text-terminal-yellow mb-3 font-bold">{`[QUESTION ${
                      currentQuestionIndex + 1
                    }/${questions.length}]`}</div>
                    <div className="text-foreground mb-4">
                      {questions[currentQuestionIndex].question}
                    </div>
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
                        className="flex-1 bg-transparent border-none outline-none text-foreground font-mono focus:bg-secondary/20 px-2 py-1 rounded"
                        placeholder={
                          questions[currentQuestionIndex].placeholder ||
                          "Type your answer and press Enter..."
                        }
                        disabled={generationState.isLoading}
                      />
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={
                          !inputValue.trim() || generationState.isLoading
                        }
                        className="disabled:opacity-50 hover:text-terminal-cyan transition-colors"
                      >
                        <Send className="w-4 h-4 text-terminal-green hover:text-terminal-cyan" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading indicator */}
                {generationState.isLoading && !isAnswering && (
                  <div className="flex items-center space-x-2 mt-4">
                    <LoadingSpinner variant="terminal" />
                    <span className="text-terminal-comment">Processing...</span>
                  </div>
                )}

                {/* Error display */}
                {generationState.error && !generationState.isLoading && (
                  <div className="flex items-start mt-4 p-3 bg-terminal-red/10 border border-terminal-red/30 rounded">
                    {getLinePrefix("Error:")}
                    <span className="flex-1 text-terminal-red">
                      {cleanLine(generationState.error)}
                    </span>
                  </div>
                )}

                {/* Success message when README is generated */}
                {generatedReadme &&
                  !generationState.isLoading &&
                  !showReadme && (
                    <div className="mt-6 p-4 bg-terminal-green/10 border border-terminal-green/30 rounded">
                      <div className="flex items-center space-x-2 text-terminal-green font-bold mb-2">
                        <Check className="w-4 h-4" />
                        <span>[README GENERATED SUCCESSFULLY]</span>
                      </div>
                      <div className="text-terminal-comment text-sm mb-3">
                        Your README.md has been generated and is ready to view.
                      </div>
                      <button
                        onClick={handleShowReadme}
                        className="terminal-button bg-terminal-green text-background hover:bg-terminal-bright-green px-4 py-2 flex items-center space-x-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View README Preview</span>
                      </button>
                    </div>
                  )}

                {/* Cursor */}
                {!generationState.isLoading &&
                  !isAnswering &&
                  !generatedReadme && (
                    <div className="flex items-center space-x-2 mt-4">
                      <span className="text-terminal-green">$</span>
                      <div className="w-2 h-4 bg-terminal-green animate-pulse"></div>
                    </div>
                  )}

                <div ref={terminalEndRef}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalAnalysisView;
