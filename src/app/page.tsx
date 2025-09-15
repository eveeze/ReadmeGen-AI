"use client";

import { useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { ReadmePreview } from "@/components/ReadmePreview";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import EnhancedAnalysisDisplay from "@/components/EnhancedAnalysisDisplay ";
import {
  GenerationState,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
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
  Code,
  Activity,
  Database,
  Globe,
  Coffee,
} from "lucide-react";

export default function HomePage() {
  const { status } = useSession();
  const [url, setUrl] = useState("");
  const [template, setTemplate] = useState<ReadmeTemplate>("Profesional");
  const [language, setLanguage] = useState<ReadmeLanguage>("English");
  const [badges, setBadges] = useState<Badge[]>([]);
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    progress: "",
  });
  const [generatedReadme, setGeneratedReadme] = useState<string>("");

  // Enhanced features states
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [projectLogo, setProjectLogo] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(true);

  const handleGenerate = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setGenerationState({
      isLoading: true,
      error: null,
      progress: "$ git clone --analyze " + targetUrl,
    });
    setGeneratedReadme("");
    setAnalysisData(null);
    setProjectLogo("");

    try {
      const progressSteps = [
        "$ git clone --analyze " + targetUrl,
        "$ npm run detect:frameworks",
        "$ docker compose config --validate",
        "$ ai analyze --deep-scan src/",
        "$ curl -X GET /api/endpoints",
        "$ generate logo --ai-powered",
        "$ markdown compile --template=" + template,
      ];

      let stepIndex = 0;
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length - 1) {
          stepIndex++;
          setGenerationState((prev) => ({
            ...prev,
            progress: progressSteps[stepIndex],
          }));
        }
      }, 2000);

      const response = await axios.post("/api/generate", {
        url: targetUrl,
        template,
        language,
        badges,
        options: {
          includeArchitecture: true,
          includeLogo: true,
          deepCodeAnalysis: true,
          enhancedTesting: true,
        },
      });

      clearInterval(progressInterval);

      if (response.data.success) {
        setGeneratedReadme(response.data.readme);
        setAnalysisData(response.data.analysis);

        if (response.data.analysis?.projectLogo?.svgContent) {
          setProjectLogo(response.data.analysis.projectLogo.svgContent);
        }

        const serverBadges = response.data.analysis.badges || [];
        setBadges((currentBadges) => {
          const customBadges = currentBadges.filter(
            (b) => !serverBadges.some((sb: Badge) => sb.name === b.name)
          );
          return [...serverBadges, ...customBadges];
        });

        setGenerationState({
          isLoading: false,
          error: null,
          progress: "$ echo 'README.md generated successfully!'",
        });
      } else {
        throw new Error(response.data.error || "Generation pipeline failed");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
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
        {/* Terminal-styled Header */}
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

          {/* Feature Matrix */}
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
          {/* URL Input Section */}
          <UrlInput
            url={url}
            setUrl={setUrl}
            onGenerate={() => handleGenerate(url)}
            isLoading={generationState.isLoading}
            error={generationState.error}
            progress={generationState.progress}
          />

          {/* Configuration Terminal */}
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
                        "professional" // comprehensive
                      </option>
                      <option value="Dasar">
                        "basic" // minimal essential
                      </option>
                      <option value="Fun/Creative">
                        "creative" // engaging style
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
                      <option value="English">"en" // english</option>
                      <option value="Indonesian">"id" // indonesian</option>
                      <option value="Spanish">"es" // spanish</option>
                      <option value="Mandarin">"zh" // mandarin</option>
                    </select>
                  </div>
                </div>

                {/* Enhanced Features Display */}
                <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border">
                  <div className="text-sm font-medium font-mono text-terminal-magenta mb-3 flex items-center">
                    <Code className="w-4 h-4 mr-2" />
                    AI_FEATURES: enabled
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    {[
                      {
                        icon: Brain,
                        label: "deep_analysis",
                        color: "terminal-blue",
                      },
                      {
                        icon: Palette,
                        label: "auto_logo",
                        color: "terminal-magenta",
                      },
                      {
                        icon: Activity,
                        label: "ci_cd_scan",
                        color: "terminal-green",
                      },
                      {
                        icon: Database,
                        label: "env_detect",
                        color: "terminal-yellow",
                      },
                    ].map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-foreground"
                      >
                        <feature.icon
                          className={`w-4 h-4 text-${feature.color}`}
                        />
                        <span>{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 text-xs font-mono text-terminal-comment">
                  <span className="text-terminal-green">$</span> :wq # save and
                  exit
                </div>
              </div>
            </div>
          </div>

          {/* Repository Selector */}
          {status === "authenticated" && (
            <div className="max-w-4xl mx-auto">
              <RepoSelector
                onSelect={setUrl}
                disabled={generationState.isLoading}
              />
            </div>
          )}

          {/* Badge Generator */}
          <div className="max-w-4xl mx-auto">
            <BadgeGenerator badges={badges} setBadges={setBadges} />
          </div>

          {/* Enhanced Analysis Display */}
          {(analysisData || generationState.isLoading) && (
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

          {/* README Preview */}
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

          {/* System Statistics */}
          {analysisData && !generationState.isLoading && (
            <div className="max-w-4xl mx-auto">
              <div className="terminal-window bg-card border border-terminal-green">
                <div className="terminal-header">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-terminal-green/20 border border-terminal-green rounded">
                      <Activity className="w-4 h-4 text-terminal-green" />
                    </div>
                    <div className="text-sm font-mono text-terminal-green">
                      system.stats --summary
                    </div>
                  </div>
                </div>
                <div className="terminal-content p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                      {
                        label: "files_scanned",
                        value:
                          analysisData.features?.codeQuality?.analyzedFiles ||
                          0,
                        color: "terminal-green",
                        icon: FileText,
                      },
                      {
                        label: "api_endpoints",
                        value: analysisData.features?.api?.endpointCount || 0,
                        color: "terminal-blue",
                        icon: Globe,
                      },
                      {
                        label: "features_detected",
                        value:
                          analysisData.metadata?.featuresDetected?.length || 0,
                        color: "terminal-magenta",
                        icon: Zap,
                      },
                      {
                        label: "env_variables",
                        value:
                          analysisData.features?.environment?.variableCount ||
                          0,
                        color: "terminal-yellow",
                        icon: Database,
                      },
                    ].map((stat, index) => (
                      <div key={index} className="space-y-2">
                        <stat.icon
                          className={`w-8 h-8 text-${stat.color} mx-auto`}
                        />
                        <div
                          className={`text-3xl font-bold font-mono text-${stat.color}`}
                        >
                          {stat.value}
                        </div>
                        <div className="text-sm text-terminal-comment font-mono">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terminal Footer */}
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
                  <span className="text-terminal-comment">v2.0.0</span>
                </div>
              </div>
              <div className="text-xs text-terminal-comment font-mono">
                $ echo "Transform repositories with intelligent analysis"
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
