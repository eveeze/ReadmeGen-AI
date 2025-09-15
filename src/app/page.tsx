"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import TerminalAnalysisView from "@/components/TerminalAnalysisView";
import {
  GenerationState,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
  AgenticQuestion,
  ProjectAnalysis,
} from "@/types";
import {
  ArrowLeft,
  Brain,
  Coffee,
  Globe,
  Palette,
  Rocket,
  Shield,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface DisplayAnalysisData {
  repository: {
    name: string;
    description: string;
    language: string;
    topics: string[];
  };
  features: {
    cicd?: {
      platform: string;
      hasAutomatedTesting: boolean;
      hasAutomatedDeployment: boolean;
      workflows: number;
    };
    testing?: {
      framework: string;
      hasUnitTests: boolean;
      hasE2ETests: boolean;
      hasCoverage: boolean;
      testCommands: number;
    };
    deployment?: {
      platform: string;
      requiresEnvVars: boolean;
      hasBuildProcess: boolean;
    };
    api: {
      endpointCount: number;
      methods: string[];
    };
    environment: {
      variableCount: number;
      requiredVars: number;
    };
    codeQuality: {
      analyzedFiles: number;
      totalComplexity: number;
      detectedFeatures: string[];
    };
    contribution: {
      hasGuide: boolean;
      hasCodeOfConduct: boolean;
      suggestedSteps: number;
    };
  };
  metadata: {
    generatedAt: string;
    analysisVersion: string;
    featuresDetected: string[];
  };
}

export default function HomePage() {
  const { status } = useSession();
  const [url, setUrl] = useState("");
  const [template, setTemplate] = useState<ReadmeTemplate>("Profesional");
  const [language, setLanguage] = useState<ReadmeLanguage>("English");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [logoUrl, setLogoUrl] = useState("");

  const [generationState, setGenerationState] = useState<
    GenerationState & { progress: string[] }
  >({
    isLoading: false,
    error: null,
    progress: [],
  });
  const [generatedReadme, setGeneratedReadme] = useState<string>("");

  const [analysisData, setAnalysisData] = useState<ProjectAnalysis | null>(
    null
  );
  const [displayAnalysisData, setDisplayAnalysisData] =
    useState<DisplayAnalysisData | null>(null);
  const [projectLogo, setProjectLogo] = useState<string>("");

  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<AgenticQuestion[]>([]);
  const [pendingAnalysis, setPendingAnalysis] =
    useState<ProjectAnalysis | null>(null);

  const [showTerminalView, setShowTerminalView] = useState(false);

  const handleGenerate = async (targetUrl: string, isReanalyzing = false) => {
    if (!targetUrl.trim()) return;

    if (!isReanalyzing) {
      setShowTerminalView(true);
    }

    setGenerationState({
      isLoading: true,
      error: null,
      progress: [`$ readmegen --analyze --url ${targetUrl}`],
    });
    setGeneratedReadme("");
    setAnalysisData(null);
    setDisplayAnalysisData(null);
    setProjectLogo("");
    setQuestions([]);
    setPendingAnalysis(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = JSON.parse(line.substring(6));

            if (json.error) throw new Error(json.error);

            if (json.progress) {
              setGenerationState((prev) => ({
                ...prev,
                progress: [...prev.progress, json.progress],
              }));
            }

            if (json.done) {
              setAnalysisData(json.analysis);
              setDisplayAnalysisData(json.analysis);
              if (json.analysis?.projectLogo?.svgContent) {
                setProjectLogo(json.analysis.projectLogo.svgContent);
              }

              if (json.questions && json.questions.length > 0) {
                setPendingAnalysis(json.analysis);
                setQuestions(json.questions);
                setGenerationState((prev) => ({
                  ...prev,
                  isLoading: false,
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
                  progress: [
                    ...prev.progress,
                    "✓ README.md generated successfully!",
                  ],
                }));
              }
            }
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setGenerationState((prev) => ({
        isLoading: false,
        error: errorMessage,
        progress: [...prev.progress, `Error: ${errorMessage}`],
      }));
    }
  };

  const handleAnswerSubmit = async (answers: Record<string, string>) => {
    setGenerationState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: [...prev.progress, "Processing user answers..."],
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const json = JSON.parse(line.substring(6));

            if (json.error) throw new Error(json.error);

            if (json.progress) {
              setGenerationState((prev) => ({
                ...prev,
                progress: [...prev.progress, json.progress],
              }));
            }

            if (json.done) {
              setGeneratedReadme(json.readme);
              setGenerationState((prev) => ({
                ...prev,
                isLoading: false,
                progress: [
                  ...prev.progress,
                  "✓ Final README.md generated successfully!",
                ],
              }));
            }
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      setGenerationState((prev) => ({
        isLoading: false,
        error: errorMessage,
        progress: [...prev.progress, `Error: ${errorMessage}`],
      }));
    }
  };

  const handleBackToHome = () => {
    setShowTerminalView(false);
    setGenerationState({ isLoading: false, error: null, progress: [] });
    setGeneratedReadme("");
    setAnalysisData(null);
    setQuestions([]);
    setPendingAnalysis(null);
  };

  const handleReAnalyze = () => {
    handleGenerate(url, true);
  };

  if (showTerminalView) {
    return (
      <div className="relative min-h-screen">
        <button
          onClick={handleBackToHome}
          className="fixed top-4 left-4 z-50 terminal-button flex items-center space-x-2 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-sm">back to home</span>
        </button>

        <TerminalAnalysisView
          url={url}
          template={template}
          language={language}
          badges={badges}
          logoUrl={logoUrl}
          isInteractive={isInteractive}
          generationState={generationState}
          generatedReadme={generatedReadme}
          analysisData={analysisData}
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
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <div className="terminal-window bg-card shadow-2xl max-w-2xl">
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
                    v2.1.0-streaming
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
                <div className="text-center font-mono">
                  <div className="text-xs text-terminal-comment mb-2">
                    $ whoami
                  </div>
                  <h1 className="text-4xl font-bold mb-4 text-terminal-green">
                    ReadmeGen.AI
                  </h1>
                  <div className="text-xs text-terminal-comment mb-4">
                    $ cat /proc/version
                  </div>
                  <p className="text-lg text-foreground mb-6">
                    AI-powered README generation with deep repository analysis
                  </p>
                  <div className="text-xs text-terminal-comment">
                    $ systemctl status readmegen
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-sm">
                    <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
                    <span className="text-terminal-green font-mono">
                      [ACTIVE] AI Engine Online
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-8">
            {[
              { icon: Brain, label: "AI Analysis", color: "terminal-blue" },
              { icon: Palette, label: "Logo Gen", color: "terminal-magenta" },
              { icon: Shield, label: "CI/CD Detect", color: "terminal-green" },
              { icon: Rocket, label: "Deploy Ready", color: "terminal-yellow" },
            ].map((feature, index) => (
              <div
                key={index}
                className="terminal-window bg-card border border-border"
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
        </div>

        <div className="space-y-8">
          <UrlInput
            url={url}
            setUrl={setUrl}
            onGenerate={() => handleGenerate(url)}
            isLoading={generationState.isLoading}
            error={generationState.error}
            progress={
              generationState.progress[generationState.progress.length - 1] ||
              ""
            }
          />

          <div className="max-w-4xl mx-auto">
            <div className="terminal-window bg-card">
              <div className="terminal-header">
                <div className="terminal-title font-mono">config.json</div>
              </div>
              <div className="terminal-content p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                      template:
                    </label>
                    <select
                      value={template}
                      onChange={(e) =>
                        setTemplate(e.target.value as ReadmeTemplate)
                      }
                      disabled={generationState.isLoading}
                      className="terminal-input w-full"
                    >
                      <option value="Profesional">"professional"</option>
                      <option value="Dasar">"basic"</option>
                      <option value="Fun/Creative">"creative"</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                      language:
                    </label>
                    <select
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value as ReadmeLanguage)
                      }
                      disabled={generationState.isLoading}
                      className="terminal-input w-full"
                    >
                      <option value="English">"en"</option>
                      <option value="Indonesian">"id"</option>
                      <option value="Spanish">"es"</option>
                      <option value="Mandarin">"zh"</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium font-mono text-terminal-yellow mb-2">
                      logo_url: (optional)
                    </label>
                    <Input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      disabled={generationState.isLoading}
                      className="terminal-input w-full"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label
                    htmlFor="interactive-mode"
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      id="interactive-mode"
                      checked={isInteractive}
                      onChange={(e) => setIsInteractive(e.target.checked)}
                      disabled={generationState.isLoading}
                      className="h-4 w-4 rounded border-border bg-input text-terminal-green focus:ring-terminal-green"
                    />
                    <span className="font-mono text-sm text-terminal-comment">
                      Enable Interactive Mode (Agentic AI)
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {status === "authenticated" && (
            <div className="max-w-4xl mx-auto">
              <RepoSelector
                onSelect={setUrl}
                disabled={generationState.isLoading}
              />
            </div>
          )}

          <div className="max-w-4xl mx-auto">
            <BadgeGenerator badges={badges} setBadges={setBadges} />
          </div>
        </div>

        <footer className="mt-16 text-center">
          <div className="text-xs text-terminal-comment font-mono">
            Powered by IBM Granite AI, GitHub API, and Vercel.
          </div>
        </footer>
      </div>
    </div>
  );
}
