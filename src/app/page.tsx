"use client";

import { useState, useEffect } from "react";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { ReadmePreview } from "@/components/ReadmePreview";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import EnhancedAnalysisDisplay from "@/components/EnhancedAnalysisDisplay ";
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
  FileText,
  Sparkles,
  TrendingUp,
  Zap,
  Brain,
  Palette,
  Shield,
  Rocket,
  Terminal,
  Globe,
  Coffee,
  ArrowLeft,
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

  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    progress: "",
  });
  const [generatedReadme, setGeneratedReadme] = useState<string>("");

  const [analysisData, setAnalysisData] = useState<ProjectAnalysis | null>(
    null
  );
  const [displayAnalysisData, setDisplayAnalysisData] =
    useState<DisplayAnalysisData | null>(null);
  const [projectLogo, setProjectLogo] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(true);

  // State baru untuk Agentic AI
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<AgenticQuestion[]>([]);
  const [pendingAnalysis, setPendingAnalysis] =
    useState<ProjectAnalysis | null>(null);

  // State baru untuk Terminal View
  const [showTerminalView, setShowTerminalView] = useState(false);

  const handleGenerate = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    // Aktivasi terminal view dengan transisi smooth
    setShowTerminalView(true);

    // Reset semua state terkait generasi sebelumnya
    setGenerationState({
      isLoading: true,
      error: null,
      progress: "Initializing repository analysis...",
    });

    // Clear previous data
    setGeneratedReadme("");
    setAnalysisData(null);
    setDisplayAnalysisData(null);
    setProjectLogo("");
    setQuestions([]);
    setPendingAnalysis(null);

    try {
      const response = await axios.post("/api/generate", {
        url: targetUrl,
        template,
        language,
        badges,
        logoUrl,
        isInteractive,
        options: {
          includeArchitecture: true,
          includeLogo: true,
        },
      });

      if (response.data.success) {
        // Store the actual analysis data for terminal animation
        setAnalysisData(response.data.analysis);

        // Jika API mengembalikan pertanyaan, simpan untuk ditampilkan di terminal
        if (response.data.questions && response.data.questions.length > 0) {
          setPendingAnalysis(response.data.analysis);
          setQuestions(response.data.questions);
          setGenerationState({
            isLoading: false,
            error: null,
            progress: "Waiting for your responses...",
          });
        } else {
          // Jika tidak ada pertanyaan, langsung tampilkan README
          setGeneratedReadme(response.data.readme);
          setDisplayAnalysisData(response.data.analysis);
          if (response.data.analysis?.projectLogo?.svgContent) {
            setProjectLogo(response.data.analysis.projectLogo.svgContent);
          }
          setGenerationState({
            isLoading: false,
            error: null,
            progress: "README.md generated successfully!",
          });
        }
      } else {
        throw new Error(response.data.error || "Generation pipeline failed");
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error ||
        (error as Error).message ||
        "Unexpected error in AI pipeline";
      setGenerationState({
        isLoading: false,
        error: errorMessage,
        progress: "",
      });
    }
  };

  const handleAnswerSubmit = async (answers: Record<string, string>) => {
    setGenerationState({
      isLoading: true,
      error: null,
      progress: "Processing answers and generating final README...",
    });
    setQuestions([]); // Clear questions after submission

    try {
      const response = await axios.post("/api/generate", {
        analysisData: pendingAnalysis,
        userAnswers: answers,
        template,
        language,
        badges,
        logoUrl,
        options: {
          includeArchitecture: true,
          includeLogo: true,
        },
      });

      if (response.data.success) {
        setGeneratedReadme(response.data.readme);
        setDisplayAnalysisData(response.data.analysis);
        setAnalysisData(response.data.analysis); // Update for terminal display
        setGenerationState({
          isLoading: false,
          error: null,
          progress: "Final README.md generated successfully!",
        });
      } else {
        throw new Error(response.data.error || "Final generation failed");
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error: string }>;
      const errorMessage =
        axiosError.response?.data?.error ||
        (error as Error).message ||
        "Unexpected error in AI pipeline";
      setGenerationState({
        isLoading: false,
        error: errorMessage,
        progress: "",
      });
    }
  };

  const handleBackToHome = () => {
    setShowTerminalView(false);
    setGeneratedReadme("");
    setAnalysisData(null);
    setDisplayAnalysisData(null);
    setProjectLogo("");
    setQuestions([]);
    setPendingAnalysis(null);
    setGenerationState({
      isLoading: false,
      error: null,
      progress: "",
    });
  };

  const handleReAnalyze = () => {
    // Reset states before re-analyzing
    setGeneratedReadme("");
    setAnalysisData(null);
    setDisplayAnalysisData(null);
    setProjectLogo("");
    setQuestions([]);
    setPendingAnalysis(null);

    // Start new analysis
    handleGenerate(url);
  };

  // Terminal view - integrated dengan sistem question/answer
  if (showTerminalView) {
    return (
      <div className="relative min-h-screen">
        {/* Back button - positioned absolutely */}
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
          questions={questions} // Pass questions to terminal
          onReAnalyze={handleReAnalyze}
          onUrlChange={setUrl}
          onTemplateChange={setTemplate}
          onLanguageChange={setLanguage}
          onLogoUrlChange={setLogoUrl}
          onInteractiveChange={setIsInteractive}
          onAnswerSubmit={handleAnswerSubmit} // Pass answer handler
        />
      </div>
    );
  }

  // Tampilan homepage normal
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
                    v2.0.0-stable
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
            progress={generationState.progress}
          />

          <div className="max-w-4xl mx-auto">
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
                      <div className="p-1.5 bg-terminal-cyan/20 border border-terminal-cyan rounded">
                        <Zap className="w-4 h-4 text-terminal-cyan" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-terminal-cyan font-mono">
                          config.json
                        </div>
                        <div className="text-xs text-terminal-comment font-mono">
                          generation options
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="terminal-content p-6">
                <div className="text-sm font-mono text-terminal-comment mb-4">
                  <span className="text-terminal-green">$</span> nano
                  readmegen.config.json
                </div>
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
                      className="terminal-input w-full bg-input border border-border text-foreground font-mono"
                    >
                      <option value="Profesional">
                        &quot;professional&quot; // comprehensive
                      </option>
                      <option value="Dasar">
                        &quot;basic&quot; // minimal essential
                      </option>
                      <option value="Fun/Creative">
                        &quot;creative&quot; // engaging style
                      </option>
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
                      className="terminal-input w-full bg-input border border-border text-foreground font-mono"
                    >
                      <option value="English">&quot;en&quot; // english</option>
                      <option value="Indonesian">
                        &quot;id&quot; // indonesian
                      </option>
                      <option value="Spanish">&quot;es&quot; // spanish</option>
                      <option value="Mandarin">
                        &quot;zh&quot; // mandarin
                      </option>
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

                {/* Checkbox Agentic AI */}
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
                      className="h-4 w-4 rounded border-border bg-input text-terminal-green focus:ring-terminal-green focus:ring-offset-background"
                    />
                    <span className="font-mono text-sm text-terminal-comment">
                      Aktifkan mode interaktif (Agentic AI) untuk pertanyaan
                      lanjutan
                    </span>
                  </label>
                </div>

                <div className="mt-4 text-xs font-mono text-terminal-comment">
                  <span className="text-terminal-green">$</span> :wq # save and
                  exit
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
          <div className="terminal-window bg-card max-w-2xl mx-auto">
            <div className="terminal-content p-6">
              <div className="flex items-center justify-center space-x-4 mb-4 text-sm font-mono">
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-terminal-blue" />
                  <span className="text-terminal-comment">IBM Granite AI</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-terminal-green" />
                  <span className="text-terminal-comment">GitHub API</span>
                </div>
                <div className="w-px h-4 bg-border"></div>
                <div className="flex items-center space-x-2">
                  <Coffee className="w-4 h-4 text-terminal-yellow" />
                  <span className="text-terminal-comment">v2.1.0</span>
                </div>
              </div>
              <div className="text-xs text-terminal-comment font-mono">
                $ echo &quot;Transform repositories with intelligent
                analysis&quot;
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
