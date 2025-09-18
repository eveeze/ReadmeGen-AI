"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { RepoSelector } from "@/components/RepoSelector";
import TerminalAnalysisView from "@/components/TerminalAnalysisView";
import {
  ArrowRight,
  Github,
  Zap,
  Terminal,
  AlertTriangle,
  CheckCircle,
  Settings,
  Award,
  ImageIcon,
  Brain,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  ArrowLeft,
  Sparkles,
  Palette,
  Rocket,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GenerationState,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
  AgenticQuestion,
  ProjectAnalysis,
} from "@/types";

export default function ImprovedHomePage() {
  const { status } = useSession();
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [template, setTemplate] = useState<ReadmeTemplate>("Profesional");
  const [language, setLanguage] = useState<ReadmeLanguage>("English");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const [isInteractive, setIsInteractive] = useState(true);

  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    progress: [],
    analysis: null,
  });
  const [generatedReadme, setGeneratedReadme] = useState<string>("");
  const [questions, setQuestions] = useState<AgenticQuestion[]>([]);
  const [pendingAnalysis, setPendingAnalysis] =
    useState<ProjectAnalysis | null>(null);

  const [showTerminalView, setShowTerminalView] = useState(false);

  const validateGitHubUrl = (url: string) => {
    const githubUrlPattern =
      /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+\/?$/;
    return githubUrlPattern.test(url.trim());
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setUrlError("");
    setIsValidUrl(validateGitHubUrl(newUrl));
  };

  const handleRepoSelect = (newUrl: string) => {
    setUrl(newUrl);
    setUrlError("");
    setIsValidUrl(validateGitHubUrl(newUrl));
  };

  const handleContinue = () => {
    if (!url.trim()) {
      setUrlError("Repository URL required");
      return;
    }
    if (!validateGitHubUrl(url)) {
      setUrlError("Invalid GitHub repository URL");
      return;
    }
    setStep(2);
  };

  const performGeneration = async () => {
    setGenerationState({
      isLoading: true,
      error: null,
      progress: [`$ readmegen --analyze --url ${url}`],
      analysis: null,
    });
    setGeneratedReadme("");
    setQuestions([]);
    setPendingAnalysis(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          template,
          language,
          badges,
          logoUrl,
          isInteractive,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        reader.cancel();
        throw new Error("Request timeout - please try again");
      }, 60000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.substring(6));

                if (json.error) throw new Error(json.error);

                if (json.progress) {
                  setGenerationState((prev) => ({
                    ...prev,
                    progress: [...prev.progress, json.progress],
                  }));
                }

                if (json.done) {
                  setPendingAnalysis(json.analysis);

                  if (json.questions && json.questions.length > 0) {
                    setQuestions(json.questions);
                    setGenerationState((prev) => ({
                      ...prev,
                      isLoading: false,
                      analysis: json.analysis,
                      progress: [
                        ...prev.progress,
                        "✓ Analysis complete. Waiting for user input...",
                      ],
                    }));
                  } else {
                    setGeneratedReadme(json.readme);
                    setGenerationState((prev) => ({
                      ...prev,
                      isLoading: false,
                      analysis: json.analysis,
                      progress: [
                        ...prev.progress,
                        "✓ README.md generated successfully!",
                      ],
                    }));
                  }
                }
              } catch (parseError) {
                console.warn("Failed to parse chunk:", parseError);
              }
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setGenerationState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: [...prev.progress, `Error: ${errorMessage}`],
      }));
    }
  };

  const handleGenerate = async () => {
    // Trigger terminal view immediately
    setShowTerminalView(true);
    await performGeneration();
  };

  const handleReAnalyze = async () => {
    // Reset all states completely before starting fresh analysis
    setGenerationState({
      isLoading: true,
      error: null,
      progress: [`$ readmegen --reanalyze --url ${url}`],
      analysis: null,
    });
    setGeneratedReadme("");
    setQuestions([]);
    setPendingAnalysis(null);

    // Perform the generation again
    await performGeneration();
  };

  const handleAnswerSubmit = async (answers: Record<string, string>) => {
    setGenerationState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: [...(prev.progress || []), "Processing user answers..."],
    }));
    setQuestions([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisData: pendingAnalysis,
          userAnswers: answers,
          template,
          language,
          badges,
          logoUrl,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const timeoutId = setTimeout(() => {
        reader.cancel();
        throw new Error("Request timeout - please try again");
      }, 60000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const json = JSON.parse(line.substring(6));

                if (json.error) throw new Error(json.error);

                if (json.progress) {
                  setGenerationState((prev) => ({
                    ...prev,
                    progress: [...(prev.progress || []), json.progress],
                  }));
                }

                if (json.done) {
                  setGeneratedReadme(json.readme);
                  setGenerationState((prev) => ({
                    ...prev,
                    isLoading: false,
                    analysis: json.analysis,
                    progress: [
                      ...(prev.progress || []),
                      "✓ Final README.md generated successfully!",
                    ],
                  }));
                }
              } catch (parseError) {
                console.warn("Failed to parse answer chunk:", parseError);
              }
            }
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setGenerationState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        progress: [...(prev.progress || []), `Error: ${errorMessage}`],
      }));
    }
  };

  const handleBackToHome = () => {
    setShowTerminalView(false);
    setStep(1);
    setGenerationState({
      isLoading: false,
      error: null,
      progress: [],
      analysis: null,
    });
    setGeneratedReadme("");
    setQuestions([]);
    setPendingAnalysis(null);
  };

  const quickBadges = [
    {
      name: "MIT License",
      url: "https://img.shields.io/badge/license-MIT-green.svg",
    },
    {
      name: "Node.js",
      url: "https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg",
    },
    {
      name: "TypeScript",
      url: "https://img.shields.io/badge/typescript-blue.svg",
    },
    {
      name: "Version",
      url: "https://img.shields.io/badge/version-1.0.0-blue.svg",
    },
  ];

  // Show terminal view with proper layout structure
  if (showTerminalView) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed Header with Back Button */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleBackToHome}
            className="terminal-button flex items-center space-x-2 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-sm">back to home</span>
          </button>

          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-terminal-green" />
            <span className="font-mono text-terminal-green">
              ReadmeGen.AI Terminal
            </span>
          </div>

          <div className="text-xs text-terminal-comment font-mono">v2.1.0</div>
        </div>

        {/* Terminal view takes remaining space */}
        <div className="flex-1 overflow-hidden">
          <TerminalAnalysisView
            url={url}
            template={template}
            language={language}
            badges={badges}
            logoUrl={logoUrl}
            isInteractive={isInteractive}
            generationState={generationState}
            generatedReadme={generatedReadme}
            questions={questions}
            onReAnalyze={handleReAnalyze}
            onUrlChange={setUrl}
            onTemplateChange={setTemplate}
            onLanguageChange={setLanguage}
            onLogoUrlChange={setLogoUrl}
            onInteractiveChange={setIsInteractive}
            onAnswerSubmit={handleAnswerSubmit}
          />
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="terminal-window bg-card shadow-2xl max-w-2xl mx-auto">
              <div className="terminal-header">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-4">
                    <div className="terminal-controls">
                      <div className="terminal-dot close"></div>
                      <div className="terminal-dot minimize"></div>
                      <div className="terminal-dot maximize"></div>
                    </div>
                    <div className="terminal-title font-mono">
                      readmegen-ai.sh
                    </div>
                  </div>
                  <div className="text-xs text-terminal-comment font-mono">
                    v2.1.0
                  </div>
                </div>
              </div>
              <div className="terminal-content p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="p-4 bg-gradient-to-r from-terminal-green/20 via-terminal-blue/20 to-terminal-cyan/20 rounded-xl border border-terminal-green">
                      <Terminal className="w-12 h-12 text-terminal-green" />
                    </div>
                    <div className="absolute -top-1 -right-1 p-1 bg-terminal-yellow rounded-full">
                      <Sparkles className="w-4 h-4 text-background" />
                    </div>
                  </div>
                </div>
                <h1 className="text-4xl font-bold mb-4 text-terminal-green font-mono">
                  ReadmeGen.AI
                </h1>
                <p className="text-lg text-foreground mb-6 font-mono">
                  AI-powered README generation with deep repository analysis
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
                  <span className="text-terminal-green font-mono">
                    [ACTIVE] AI Engine Online
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            {[
              { icon: Brain, label: "AI Analysis", color: "terminal-blue" },
              { icon: Palette, label: "Logo Gen", color: "terminal-magenta" },
              { icon: Shield, label: "CI/CD Detect", color: "terminal-green" },
              { icon: Rocket, label: "Deploy Ready", color: "terminal-yellow" },
            ].map((feature, index) => (
              <div
                key={index}
                className="terminal-window bg-card border border-border hover:border-terminal-green/50 transition-all duration-300 hover:scale-105"
              >
                <div className="terminal-content p-4 text-center">
                  <feature.icon
                    className={`w-8 h-8 text-${feature.color} mx-auto mb-2`}
                  />
                  <div className="text-sm font-medium font-mono text-foreground">
                    {feature.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Repository Input */}
          <div className="terminal-window bg-card shadow-2xl">
            <div className="terminal-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="terminal-controls">
                    <div className="terminal-dot close"></div>
                    <div className="terminal-dot minimize"></div>
                    <div className="terminal-dot maximize"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-terminal-blue/20 border border-terminal-blue rounded">
                      <Github className="w-4 h-4 text-terminal-blue" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-terminal-blue font-mono">
                        Step 1: Repository
                      </div>
                      <div className="text-xs text-terminal-comment font-mono">
                        enter github url
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-terminal-comment font-mono">
                  1 / 2
                </div>
              </div>
            </div>

            <div className="terminal-content p-8">
              <div className="text-sm font-mono text-terminal-comment mb-6">
                <span className="text-terminal-green">$</span> readmegen --init
                --repository
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium font-mono text-terminal-yellow mb-3">
                    GitHub Repository URL
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 h-4 w-4 text-terminal-comment">
                      <Github className="h-4 w-4" />
                    </div>
                    <Input
                      type="url"
                      placeholder="https://github.com/username/repository"
                      value={url}
                      onChange={handleUrlChange}
                      className={`terminal-input pl-10 text-lg py-4 ${
                        url &&
                        (isValidUrl
                          ? "border-terminal-green"
                          : "border-terminal-red")
                      }`}
                    />
                    {url && (
                      <div className="absolute right-3 top-3">
                        {isValidUrl ? (
                          <CheckCircle className="h-5 w-5 text-terminal-green" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-terminal-red" />
                        )}
                      </div>
                    )}
                  </div>

                  {urlError && (
                    <div className="flex items-center space-x-2 text-sm text-terminal-red font-mono mt-3">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Error: {urlError}</span>
                    </div>
                  )}

                  {url && isValidUrl && !urlError && (
                    <div className="flex items-center space-x-2 text-sm text-terminal-green font-mono mt-3">
                      <CheckCircle className="w-4 h-4" />
                      <span>Valid GitHub repository URL</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-6 border-t border-border">
                  <div className="text-sm text-terminal-comment font-mono">
                    We&apos;ll analyze your repository structure and generate a
                    professional README
                  </div>
                  <Button
                    onClick={handleContinue}
                    disabled={!url.trim() || !isValidUrl}
                    className="terminal-button bg-terminal-blue hover:bg-terminal-cyan hover:text-background text-lg px-8 py-3"
                  >
                    <span className="font-mono">Continue</span>
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Start Options - RepoSelector */}
          {status === "authenticated" && (
            <div className="mt-8">
              <RepoSelector onSelect={handleRepoSelect} disabled={false} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Configuration & Generate
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header with back button */}
        <div className="mb-8">
          <button
            onClick={() => setStep(1)}
            className="terminal-button flex items-center space-x-2 mb-6"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span className="font-mono">Back to repository</span>
          </button>

          <div className="terminal-window bg-card">
            <div className="terminal-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <div className="terminal-controls">
                    <div className="terminal-dot close"></div>
                    <div className="terminal-dot minimize"></div>
                    <div className="terminal-dot maximize"></div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-terminal-green/20 border border-terminal-green rounded">
                      <Settings className="w-4 h-4 text-terminal-green" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-terminal-green font-mono">
                        Step 2: Configuration
                      </div>
                      <div className="text-xs text-terminal-comment font-mono">
                        {url}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-terminal-comment font-mono">
                  2 / 2
                </div>
              </div>
            </div>

            <div className="terminal-content p-8">
              {/* Main Generate Button */}
              <div className="text-center mb-8">
                <Button
                  onClick={handleGenerate}
                  disabled={generationState.isLoading}
                  className="terminal-button bg-terminal-green hover:bg-terminal-bright-green hover:text-background text-xl px-12 py-6"
                >
                  {generationState.isLoading ? (
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-mono">Generating README...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <Zap className="h-6 w-6" />
                      <span className="font-mono">Generate README.md</span>
                    </div>
                  )}
                </Button>
                <div className="text-sm text-terminal-comment font-mono mt-3">
                  Using AI analysis with smart defaults
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <div className="border-t border-border pt-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between p-4 bg-secondary/30 hover:bg-secondary border border-border rounded font-mono text-sm transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Settings className="w-4 h-4 text-terminal-blue" />
                    <span>Advanced Configuration</span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-6 space-y-6 p-6 bg-secondary/20 border border-border rounded">
                    {/* Basic Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                          Template Style
                        </label>
                        <select
                          value={template}
                          onChange={(e) =>
                            setTemplate(e.target.value as ReadmeTemplate)
                          }
                          className="terminal-input w-full"
                        >
                          <option value="Profesional">Professional</option>
                          <option value="Dasar">Basic</option>
                          <option value="Fun/Creative">Creative</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) =>
                            setLanguage(e.target.value as ReadmeLanguage)
                          }
                          className="terminal-input w-full"
                        >
                          <option value="English">English</option>
                          <option value="Indonesian">Indonesian</option>
                          <option value="Spanish">Spanish</option>
                          <option value="Mandarin">Chinese</option>
                        </select>
                      </div>
                    </div>

                    {/* Logo URL */}
                    <div>
                      <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                        <ImageIcon className="w-4 h-4 inline mr-2" />
                        Logo URL (optional)
                      </label>
                      <Input
                        type="url"
                        placeholder="https://example.com/logo.png"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="terminal-input"
                      />
                    </div>

                    {/* Quick Badges */}
                    <div>
                      <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                        <Award className="w-4 h-4 inline mr-2" />
                        Quick Add Badges
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {quickBadges.map((badge, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              if (!badges.find((b) => b.name === badge.name)) {
                                setBadges([...badges, { ...badge, link: "" }]);
                              }
                            }}
                            className="flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary border border-border rounded transition-colors text-sm"
                            disabled={badges.some((b) => b.name === badge.name)}
                          >
                            <span className="font-mono">{badge.name}</span>
                            <Plus className="w-4 h-4" />
                          </button>
                        ))}
                      </div>

                      {badges.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-mono text-terminal-comment mb-2">
                            Selected badges:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {badges.map((badge, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2 bg-terminal-green/20 border border-terminal-green rounded px-3 py-1"
                              >
                                <span className="text-sm font-mono">
                                  {badge.name}
                                </span>
                                <button
                                  onClick={() =>
                                    setBadges(
                                      badges.filter((_, i) => i !== index)
                                    )
                                  }
                                  className="text-terminal-red hover:text-terminal-bright-red"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Mode */}
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInteractive}
                          onChange={(e) => setIsInteractive(e.target.checked)}
                          disabled={generationState.isLoading}
                          className="h-4 w-4 rounded border-border bg-input text-terminal-green focus:ring-terminal-green"
                        />
                        <div className="flex items-center space-x-2">
                          <Brain className="w-4 h-4 text-terminal-cyan" />
                          <span className="font-mono text-sm">
                            Enable Interactive Mode (Agentic AI)
                          </span>
                        </div>
                      </label>
                      <div className="text-xs text-terminal-comment font-mono mt-2 ml-7">
                        AI will ask clarifying questions for better results
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
