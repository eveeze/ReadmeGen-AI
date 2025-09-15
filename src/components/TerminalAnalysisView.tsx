"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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

interface TerminalAnalysisViewProps {
  url: string;
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  badges: Badge[];
  logoUrl: string;
  isInteractive: boolean;
  generationState: GenerationState;
  generatedReadme: string;
  analysisData?: ProjectAnalysis | null;
  questions?: AgenticQuestion[];
  onReAnalyze: () => void;
  onUrlChange: (url: string) => void;
  onTemplateChange: (template: ReadmeTemplate) => void;
  onLanguageChange: (language: ReadmeLanguage) => void;
  onLogoUrlChange: (logoUrl: string) => void;
  onInteractiveChange: (isInteractive: boolean) => void;
  onAnswerSubmit?: (answers: Record<string, string>) => void;
}

interface TerminalLine {
  id: string;
  text: string;
  type: "normal" | "input" | "question" | "answer" | "system";
  timestamp: number;
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
  analysisData,
  questions = [],
  onReAnalyze,
  onUrlChange,
  onTemplateChange,
  onLanguageChange,
  onLogoUrlChange,
  onInteractiveChange,
  onAnswerSubmit,
}) => {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [showReadme, setShowReadme] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [terminalVisible, setTerminalVisible] = useState(true);

  // Interactive mode states
  const [isInQuestionMode, setIsInQuestionMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");

  // Animation control states
  const [animationId, setAnimationId] = useState<string>("");
  const [isAnimating, setIsAnimating] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<boolean>(false);

  // Generate file list based on analysis data or default
  const generateFileList = (analysis?: ProjectAnalysis | null) => {
    if (analysis?.keyFiles && analysis.keyFiles.length > 0) {
      return analysis.keyFiles.slice(0, 6).map((file) => `./${file}`);
    }

    // Default files based on common project types
    const defaultFiles = [
      "./go.mod",
      "./main.go",
      "./README.md",
      "./Dockerfile",
      "./go.sum",
    ];

    return defaultFiles;
  };

  // Generate analysis steps
  const generateAnalysisSteps = useCallback(
    (analysis?: ProjectAnalysis | null) => {
      const mainLang = analysis?.mainLanguage || "Go";
      const frameworks = analysis?.frameworks || ["Standard Library"];
      const packageManagers = analysis?.packageManagers || ["Go Modules"];

      const files = generateFileList(analysis);

      const steps = [
        { text: `$ git clone --analyze ${url}`, delay: 1000 },
        { text: "[INFO] Initializing repository analysis...", delay: 800 },
        { text: "[INFO] Cloning repository from GitHub...", delay: 600 },
        { text: "[SUCCESS] Repository cloned successfully", delay: 400 },
        { text: "", delay: 200 },
        {
          text: '$ find . -type f -name "*.go" -o -name "*.mod" -o -name "*.md" | head -10',
          delay: 800,
        },
        ...files.map((file) => ({ text: file, delay: 100 })),
        { text: "", delay: 300 },
        { text: "$ readmegen --deep-scan --ai-analysis", delay: 1000 },
        { text: "[SCANNER] Detecting project structure...", delay: 1200 },
        { text: `  ├── Language: ${mainLang} detected`, delay: 400 },
        ...frameworks.map((fw) => ({
          text: `  ├── Framework: ${fw} detected`,
          delay: 400,
        })),
        ...packageManagers.map((pm) => ({
          text: `  ├── Package manager: ${pm} detected`,
          delay: 400,
        })),
        {
          text: `  └── Repository: ${
            analysis?.repository?.name || "Project"
          } analyzed`,
          delay: 400,
        },
        { text: "", delay: 200 },
        { text: "[AI] Starting IBM Granite AI analysis...", delay: 1500 },
        {
          text: "[AI] Loading natural language processing model...",
          delay: 1200,
        },
        { text: "[AI] Analyzing code architecture patterns...", delay: 1800 },
      ];

      if (isInteractive) {
        steps.push({
          text: "[AI] Interactive mode enabled - preparing questions...",
          delay: 1000,
        });
      } else {
        steps.push(
          { text: "[AI] Generating intelligent documentation...", delay: 2000 },
          {
            text: "[AI] Optimizing README structure and content...",
            delay: 1600,
          }
        );
      }

      return steps;
    },
    [url, isInteractive]
  );

  // Animate terminal output
  const animateTerminal = useCallback(
    async (steps: Array<{ text: string; delay: number }>) => {
      if (animationRef.current) return; // Prevent double animation

      animationRef.current = true;
      setIsAnimating(true);

      for (const step of steps) {
        if (!animationRef.current) break; // Stop if animation was cancelled

        if (step.text === "") {
          setTerminalLines((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              text: "",
              type: "normal",
              timestamp: Date.now(),
            },
          ]);
        } else {
          setTerminalLines((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              text: step.text,
              type: "normal",
              timestamp: Date.now(),
            },
          ]);
        }

        await new Promise((resolve) => setTimeout(resolve, step.delay));
      }

      setIsAnimating(false);

      // Handle post-animation logic
      if (isInteractive && questions.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsInQuestionMode(true);
        setCurrentQuestionIndex(0);
        await startQuestions();
      } else if (!isInteractive && generatedReadme) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `${Date.now()}-success`,
            text: "[SUCCESS] README.md generated successfully!",
            type: "system",
            timestamp: Date.now(),
          },
        ]);

        setTimeout(() => {
          setTerminalVisible(false);
          setShowReadme(true);
        }, 1500);
      }
    },
    [isInteractive, questions, generatedReadme]
  );

  // Start questions
  const startQuestions = async () => {
    if (questions.length === 0) return;

    setTerminalLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-q-start-1`,
        text: "",
        type: "normal",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-q-start-2`,
        text: "[AI] Interactive mode activated",
        type: "system",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-q-start-3`,
        text: "[AI] Please answer the following questions for better README generation:",
        type: "system",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-q-start-4`,
        text: "",
        type: "normal",
        timestamp: Date.now(),
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 500));
    showNextQuestion();
  };

  const showNextQuestion = () => {
    if (currentQuestionIndex >= questions.length) {
      finishQuestions();
      return;
    }

    const question = questions[currentQuestionIndex];
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-q-${currentQuestionIndex}`,
        text: `[Q${currentQuestionIndex + 1}] ${question.question}`,
        type: "question",
        timestamp: Date.now(),
      },
    ]);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleAnswerSubmit = async () => {
    if (!inputValue.trim()) return;

    const answer = inputValue.trim();
    const currentQuestion = questions[currentQuestionIndex];

    // Add answer to terminal
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-answer`,
        text: `$ ${answer}`,
        type: "answer",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-ack`,
        text: "[AI] Answer recorded",
        type: "system",
        timestamp: Date.now(),
      },
    ]);

    // Store answer
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestion.question]: answer,
    }));

    setInputValue("");
    setCurrentQuestionIndex((prev) => prev + 1);

    await new Promise((resolve) => setTimeout(resolve, 800));
    showNextQuestion();
  };

  const finishQuestions = async () => {
    setTerminalLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-finish-1`,
        text: "",
        type: "normal",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-finish-2`,
        text: "[AI] All questions answered. Processing responses...",
        type: "system",
        timestamp: Date.now(),
      },
      {
        id: `${Date.now()}-finish-3`,
        text: "[AI] Generating enhanced README with user context...",
        type: "system",
        timestamp: Date.now(),
      },
    ]);

    if (onAnswerSubmit) {
      onAnswerSubmit(userAnswers);
    }

    setIsInQuestionMode(false);
  };

  // Handle keypress for input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isInQuestionMode && inputValue.trim()) {
      handleAnswerSubmit();
    }
  };

  // Main effect to start animation
  useEffect(() => {
    const newAnimationId = `${Date.now()}-${Math.random()}`;

    if (
      generationState.isLoading &&
      !isAnimating &&
      terminalLines.length === 0
    ) {
      setAnimationId(newAnimationId);
      setTerminalLines([]);
      animationRef.current = false; // Reset animation ref

      const steps = generateAnalysisSteps(analysisData);
      animateTerminal(steps);
    }
  }, [
    generationState.isLoading,
    generateAnalysisSteps,
    analysisData,
    animateTerminal,
    isAnimating,
    terminalLines.length,
  ]);

  // Handle questions when they arrive
  useEffect(() => {
    if (
      questions.length > 0 &&
      !isInQuestionMode &&
      !isAnimating &&
      terminalLines.length > 0
    ) {
      setIsInQuestionMode(true);
      setCurrentQuestionIndex(0);
      startQuestions();
    }
  }, [questions, isInQuestionMode, isAnimating, terminalLines.length]);

  // Show README when generation complete
  useEffect(() => {
    if (
      generatedReadme &&
      !generationState.isLoading &&
      !isInQuestionMode &&
      !isAnimating
    ) {
      setTimeout(() => {
        setTerminalLines((prev) => [
          ...prev,
          {
            id: `${Date.now()}-final-success`,
            text: "[SUCCESS] Enhanced README.md generated!",
            type: "system",
            timestamp: Date.now(),
          },
        ]);

        setTimeout(() => {
          setTerminalVisible(false);
          setShowReadme(true);
        }, 1500);
      }, 1000);
    }
  }, [
    generatedReadme,
    generationState.isLoading,
    isInQuestionMode,
    isAnimating,
  ]);

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackToTerminal = () => {
    setTerminalVisible(true);
    setShowReadme(false);
  };

  const handleReAnalyze = () => {
    // Stop any ongoing animation
    animationRef.current = false;

    // Reset all states
    setTerminalLines([]);
    setShowReadme(false);
    setIsInQuestionMode(false);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setInputValue("");
    setIsAnimating(false);
    setAnimationId("");

    // Trigger re-analysis
    onReAnalyze();
  };

  const getLineColor = (line: TerminalLine) => {
    if (line.type === "question") return "text-terminal-yellow";
    if (line.type === "answer") return "text-terminal-cyan";
    if (line.type === "input") return "text-terminal-green";
    if (line.type === "system") return "text-terminal-magenta";

    const text = line.text;
    if (text.startsWith("[INFO]")) return "text-terminal-blue";
    if (text.startsWith("[SCANNER]")) return "text-terminal-yellow";
    if (text.startsWith("[AI]")) return "text-terminal-magenta";
    if (text.startsWith("[SUCCESS]")) return "text-terminal-green";
    if (text.startsWith("[ERROR]")) return "text-terminal-red";
    if (text.startsWith("$")) return "text-terminal-green";
    if (text.startsWith("  ├──") || text.startsWith("  └──"))
      return "text-terminal-cyan";
    if (text.startsWith("./")) return "text-terminal-comment";
    return "text-foreground";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen">
        {/* Left Sidebar - Configuration */}
        <div
          className={`${
            showSidebar ? "w-80" : "w-12"
          } bg-card border-r border-border transition-all duration-300 flex flex-col`}
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2
              className={`text-lg font-bold text-terminal-green font-mono ${
                !showSidebar && "hidden"
              }`}
            >
              Configuration
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
              {/* URL Input */}
              <div>
                <label className="block text-xs font-mono text-terminal-yellow mb-2">
                  repository_url:
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => onUrlChange(e.target.value)}
                  className="terminal-input w-full text-xs"
                  disabled={generationState.isLoading}
                />
              </div>

              {/* Template Selection */}
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
                  disabled={generationState.isLoading}
                >
                  <option value="Profesional">Professional</option>
                  <option value="Dasar">Basic</option>
                  <option value="Fun/Creative">Creative</option>
                </select>
              </div>

              {/* Language Selection */}
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
                  disabled={generationState.isLoading}
                >
                  <option value="English">English</option>
                  <option value="Indonesian">Indonesian</option>
                  <option value="Spanish">Spanish</option>
                  <option value="Mandarin">Mandarin</option>
                </select>
              </div>

              {/* Logo URL */}
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
                  disabled={generationState.isLoading}
                />
              </div>

              {/* Interactive Mode */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInteractive}
                    onChange={(e) => onInteractiveChange(e.target.checked)}
                    disabled={generationState.isLoading}
                    className="h-3 w-3 rounded border-border bg-input text-terminal-green"
                  />
                  <span className="text-xs font-mono text-terminal-comment">
                    interactive_mode
                  </span>
                </label>
              </div>

              {/* Re-analyze Button */}
              <button
                onClick={handleReAnalyze}
                disabled={generationState.isLoading || !url.trim()}
                className="w-full terminal-button text-xs py-2 disabled:opacity-50"
              >
                {generationState.isLoading ? "Analyzing..." : "Re-analyze"}
              </button>

              {/* Action Buttons */}
              {showReadme && (
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

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Terminal Section */}
          {terminalVisible && (
            <div className="flex-1 terminal-window border-0 rounded-none">
              {/* Terminal Header */}
              <div className="terminal-header">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className="terminal-controls">
                      <div className="terminal-dot close"></div>
                      <div className="terminal-dot minimize"></div>
                      <div className="terminal-dot maximize"></div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Terminal className="w-4 h-4 text-terminal-green" />
                      <span className="text-terminal-green font-mono text-sm">
                        readmegen-terminal{" "}
                        {isInteractive && isInQuestionMode && "(interactive)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terminal Content */}
              <div
                className="terminal-content flex-1 overflow-auto max-h-[calc(100vh-200px)]"
                ref={terminalRef}
              >
                <div className="p-6 font-mono text-sm min-h-full">
                  {terminalLines.map((line) => (
                    <div key={line.id} className={`mb-1 ${getLineColor(line)}`}>
                      {line.text || "\u00A0"}
                    </div>
                  ))}

                  {/* Interactive input */}
                  {isInQuestionMode && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-terminal-green">$ </span>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="flex-1 bg-transparent border-none outline-none text-foreground font-mono"
                        placeholder="Type your answer and press Enter..."
                      />
                      <button
                        onClick={handleAnswerSubmit}
                        disabled={!inputValue.trim()}
                        className="text-terminal-green hover:text-terminal-yellow disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {!isAnimating &&
                    !generationState.isLoading &&
                    !isInQuestionMode && (
                      <div className="text-terminal-green">
                        $ <span className="animate-pulse">█</span>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* README View Section */}
          {showReadme && !terminalVisible && (
            <div className="flex-1 flex flex-col bg-background">
              {/* README Header with View Toggle */}
              <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-terminal-green" />
                  <span className="text-lg font-mono text-terminal-green">
                    README.md
                  </span>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center bg-secondary rounded border border-border overflow-hidden">
                    <button
                      onClick={() => setViewMode("preview")}
                      className={`px-4 py-2 text-sm font-mono transition-all flex items-center space-x-2 ${
                        viewMode === "preview"
                          ? "bg-terminal-green text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() => setViewMode("raw")}
                      className={`px-4 py-2 text-sm font-mono transition-all flex items-center space-x-2 ${
                        viewMode === "raw"
                          ? "bg-terminal-green text-background"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Code className="w-4 h-4" />
                      <span>Raw</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* README Content */}
              <div className="flex-1 overflow-hidden">
                {viewMode === "preview" ? (
                  <div className="h-full overflow-auto bg-background">
                    <div className="max-w-4xl mx-auto p-8">
                      <ReadmePreview content={generatedReadme} />
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-auto bg-background">
                    <div className="p-6">
                      <div className="bg-card rounded-lg border border-border p-6 font-mono text-sm">
                        <pre className="text-foreground whitespace-pre-wrap leading-relaxed overflow-x-auto">
                          {generatedReadme}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalAnalysisView;
