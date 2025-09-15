// src/app/api/generate/route.ts
import { NextRequest } from "next/server";
import { GitHubAnalyzer } from "@/lib/github";
import { AIReadmeGenerator } from "@/lib/ai";
import { extractGitHubInfo } from "@/lib/utils";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import {
  HistoryEntry,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
  ProjectAnalysis,
} from "@/types";

// Interface dan tipe data yang diperlukan
interface GenerateRequestBody {
  url?: string;
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  badges: Badge[];
  options?: {
    includeArchitecture?: boolean;
    includeLogo?: boolean;
  };
  isInteractive?: boolean;
  analysisData?: ProjectAnalysis;
  userAnswers?: Record<string, string>;
  logoUrl?: string;
}

// Fungsi helper untuk memformat data analisis
function formatAnalysisForResponse(analysis: ProjectAnalysis) {
  const featuresDetected = [
    analysis.cicdConfig && "CI/CD Pipeline",
    analysis.testConfig && "Testing Framework",
    analysis.deploymentConfig && "Deployment Config",
    analysis.apiEndpoints.length > 0 && "API Endpoints",
    analysis.envVariables.length > 0 && "Environment Configuration",
    analysis.contributionGuide.hasCustomGuide && "Contribution Guidelines",
  ].filter(Boolean) as string[];

  return {
    ...analysis,
    features: {
      cicd: analysis.cicdConfig
        ? {
            platform: analysis.cicdConfig.platform,
            hasAutomatedTesting: !!analysis.cicdConfig.hasTesting,
            hasAutomatedDeployment: !!analysis.cicdConfig.hasDeployment,
            workflows: analysis.cicdConfig.workflows?.length || 0,
          }
        : undefined,
      testing: analysis.testConfig
        ? {
            framework: analysis.testConfig.framework,
            hasUnitTests: !!analysis.testConfig.unitTests,
            hasE2ETests: !!analysis.testConfig.e2eTests,
            hasCoverage: !!analysis.testConfig.coverage,
            testCommands: analysis.testConfig.commands.length,
          }
        : undefined,
      deployment: analysis.deploymentConfig
        ? {
            platform: analysis.deploymentConfig.platform,
            requiresEnvVars: !!analysis.deploymentConfig.requiresEnv,
            hasBuildProcess: !!analysis.deploymentConfig.buildCommand,
          }
        : undefined,
      api: {
        endpointCount: analysis.apiEndpoints.length,
        methods: [...new Set(analysis.apiEndpoints.map((e) => e.method))],
      },
      environment: {
        variableCount: analysis.envVariables.length,
        requiredVars: analysis.envVariables.filter((v) => v.required).length,
      },
      codeQuality: {
        analyzedFiles: analysis.summarizedCodeSnippets.length,
        totalComplexity: analysis.summarizedCodeSnippets.reduce(
          (acc, snippet) => {
            const complexityScore =
              snippet.complexity === "high"
                ? 3
                : snippet.complexity === "medium"
                ? 2
                : 1;
            return acc + complexityScore;
          },
          0
        ),
        detectedFeatures: [
          ...new Set(
            analysis.summarizedCodeSnippets.flatMap(
              (s) => s.detectedFeatures || []
            )
          ),
        ],
      },
      contribution: {
        hasGuide: analysis.contributionGuide.hasCustomGuide,
        hasCodeOfConduct: analysis.contributionGuide.codeOfConduct,
        suggestedSteps: analysis.contributionGuide.suggestedSteps.length,
      },
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      analysisVersion: "2.1.0",
      featuresDetected,
    },
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body: GenerateRequestBody = await req.json();

  const {
    url,
    template,
    language,
    badges,
    isInteractive,
    analysisData,
    userAnswers,
    logoUrl,
  } = body;

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!replicateToken) {
    return new Response(
      JSON.stringify({ error: "AI service not configured." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress = (progress: string, data?: any) => {
        const payload = { progress, data };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      try {
        const aiGenerator = new AIReadmeGenerator(replicateToken);

        if (userAnswers && analysisData) {
          sendProgress("Processing user answers and context...");
          const readmeContent = await aiGenerator.generateReadme(
            analysisData,
            template,
            language,
            badges,
            userAnswers,
            logoUrl
          );
          const finalAnalysis = formatAnalysisForResponse(analysisData);

          // Simpan ke riwayat
          if (session?.user?.email) {
            const repoInfo = extractGitHubInfo(
              analysisData.repository.html_url
            );
            if (repoInfo) {
              const historyKey = `history:${session.user.email}`;
              const historyEntry: HistoryEntry = {
                id: `${new Date().toISOString()}-${repoInfo.repo}`,
                repoName: `${repoInfo.owner}/${repoInfo.repo}`,
                repoUrl: analysisData.repository.html_url,
                readme: readmeContent,
                generatedAt: new Date().toISOString(),
              };
              await kv.lpush(historyKey, historyEntry);
              await kv.ltrim(historyKey, 0, 9);
            }
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                readme: readmeContent,
                analysis: finalAnalysis,
              })}\n\n`
            )
          );
        } else {
          if (!url) throw new Error("GitHub URL is required");
          const repoInfo = extractGitHubInfo(url);
          if (!repoInfo) throw new Error("Invalid GitHub URL format.");

          const githubAnalyzer = new GitHubAnalyzer(githubToken, sendProgress);
          const analysisResult = await githubAnalyzer.analyzeProject(
            repoInfo.owner,
            repoInfo.repo
          );
          const formattedAnalysis = formatAnalysisForResponse(analysisResult);

          if (isInteractive) {
            sendProgress("AI is generating clarifying questions...");
            const questions = await aiGenerator.generateClarifyingQuestions(
              analysisResult
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  analysis: formattedAnalysis,
                  questions,
                })}\n\n`
              )
            );
          } else {
            sendProgress("AI is generating the README content...");
            const readmeContent = await aiGenerator.generateReadme(
              analysisResult,
              template,
              language,
              badges,
              undefined,
              logoUrl
            );

            // Simpan ke riwayat
            if (session?.user?.email) {
              const historyKey = `history:${session.user.email}`;
              const historyEntry: HistoryEntry = {
                id: `${new Date().toISOString()}-${repoInfo.repo}`,
                repoName: `${repoInfo.owner}/${repoInfo.repo}`,
                repoUrl: url,
                readme: readmeContent,
                generatedAt: new Date().toISOString(),
              };
              await kv.lpush(historyKey, historyEntry);
              await kv.ltrim(historyKey, 0, 9);
            }

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  readme: readmeContent,
                  analysis: formattedAnalysis,
                })}\n\n`
              )
            );
          }
        }
        controller.close();
      } catch (error) {
        console.error("Streaming API Error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "An unknown error occurred during generation.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: "ReadmeGen AI - Streaming API Endpoint",
      version: "2.1.0-streaming",
      status: "healthy",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
