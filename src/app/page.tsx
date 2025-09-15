"use client";

import { useState } from "react";
import axios, { AxiosError } from "axios";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { ReadmePreview } from "@/components/ReadmePreview";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import EnhancedAnalysisDisplay from "@/components/EnhancedAnalysisDisplay ";
import { Questionnaire } from "@/components/Questionnaire"; // Komponen baru
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
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Definisikan tipe yang sesuai dengan props EnhancedAnalysisDisplay
// Tipe ini bisa dihapus jika Anda mengimpor ProjectAnalysis dan menggunakannya secara langsung
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

  const [analysisData, setAnalysisData] = useState<DisplayAnalysisData | null>(
    null
  );
  const [projectLogo, setProjectLogo] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(true);

  // State baru untuk Agentic AI
  const [isInteractive, setIsInteractive] = useState(false);
  const [questions, setQuestions] = useState<AgenticQuestion[]>([]);
  const [pendingAnalysis, setPendingAnalysis] =
    useState<ProjectAnalysis | null>(null);

  const handleGenerate = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    // Reset semua state terkait generasi sebelumnya
    setGenerationState({
      isLoading: true,
      error: null,
      progress: "$ git clone --analyze " + targetUrl,
    });
    setGeneratedReadme("");
    setAnalysisData(null);
    setProjectLogo("");
    setQuestions([]);
    setPendingAnalysis(null);

    try {
      const response = await axios.post("/api/generate", {
        url: targetUrl,
        template,
        language,
        badges,
        logoUrl, // Pass logoUrl to the API
        isInteractive, // Kirim flag interaktif
        options: {
          includeArchitecture: true,
          includeLogo: true,
        },
      });

      if (response.data.success) {
        // Jika API mengembalikan pertanyaan, masuk ke mode interaktif
        if (response.data.questions && response.data.questions.length > 0) {
          setPendingAnalysis(response.data.analysis);
          setQuestions(response.data.questions);
          setGenerationState({
            isLoading: false,
            error: null,
            progress: "Menunggu jawaban Anda...",
          });
        } else {
          // Jika tidak, langsung tampilkan README
          setGeneratedReadme(response.data.readme);
          setAnalysisData(response.data.analysis);
          if (response.data.analysis?.projectLogo?.svgContent) {
            setProjectLogo(response.data.analysis.projectLogo.svgContent);
          }
          setGenerationState({
            isLoading: false,
            error: null,
            progress: "$ echo 'README.md generated successfully!'",
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
      progress: "Memproses jawaban dan membuat README final...",
    });
    setQuestions([]);

    try {
      const response = await axios.post("/api/generate", {
        analysisData: pendingAnalysis,
        userAnswers: answers,
        template,
        language,
        badges,
        logoUrl, // Pass logoUrl to the API
        options: {
          includeArchitecture: true,
          includeLogo: true,
        },
      });

      if (response.data.success) {
        setGeneratedReadme(response.data.readme);
        setAnalysisData(response.data.analysis);
        setGenerationState({
          isLoading: false,
          error: null,
          progress: "$ echo 'Final README.md generated successfully!'",
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

          {/* BARU: Tampilkan Form Pertanyaan jika ada */}
          {questions.length > 0 && !generationState.isLoading && (
            <Questionnaire
              questions={questions}
              onSubmit={handleAnswerSubmit}
              isLoading={generationState.isLoading}
            />
          )}

          {/* Tampilkan Hasil Analisis */}
          {(analysisData ||
            (generationState.isLoading && !questions.length)) && (
            <div className="animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-terminal-cyan/20 border border-terminal-cyan rounded">
                    <TrendingUp className="w-5 h-5 text-terminal-cyan" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-mono text-terminal-cyan">
                      Analysis Report
                    </h2>
                    <div className="text-sm text-terminal-comment font-mono">
                      deep repository scan results
                    </div>
                  </div>
                </div>
                {analysisData && (
                  <button
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="terminal-button px-4 py-2 text-sm hover:bg-terminal-blue hover:text-background"
                  >
                    <span className="font-mono">
                      {showAnalysis ? "hide" : "show"} --details
                    </span>
                  </button>
                )}
              </div>
              {showAnalysis && (
                <EnhancedAnalysisDisplay
                  analysisData={analysisData}
                  projectLogo={projectLogo}
                  isLoading={generationState.isLoading}
                />
              )}
            </div>
          )}

          {/* Tampilkan README */}
          {generatedReadme && (
            <div className="animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-terminal-green/20 border border-terminal-green rounded">
                    <FileText className="w-5 h-5 text-terminal-green" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-mono text-terminal-green">
                      README.md
                    </h2>
                    <div className="text-sm text-terminal-comment font-mono">
                      ai-generated documentation
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-sm text-terminal-comment font-mono">
                  <Sparkles className="w-4 h-4 text-terminal-yellow" />
                  <span>powered by IBM Granite</span>
                </div>
              </div>
              <ReadmePreview content={generatedReadme} />
            </div>
          )}
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
