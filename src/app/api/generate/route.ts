import { NextRequest, NextResponse } from "next/server";
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

interface HistoryMetadata {
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  customBadges: number;
  analysisFeatures: string[];
}

interface GenerateRequestBody {
  url?: string;
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  badges: Badge[];
  options?: {
    includeArchitecture?: boolean;
    includeLogo?: boolean;
    deepCodeAnalysis?: boolean;
    enhancedTesting?: boolean;
  };
  isInteractive?: boolean;
  analysisData?: ProjectAnalysis;
  userAnswers?: Record<string, string>;
  logoUrl?: string; // Ditambahkan untuk menerima logoUrl
}

/**
 * Helper function untuk mengubah data analisis mentah menjadi format yang diharapkan frontend.
 * DIPERBAIKI: Sekarang menyertakan summarizedCodeSnippets.
 */
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
    // Memasukkan semua properti dari analisis asli
    ...analysis,
    // Menimpa beberapa properti dengan format yang lebih spesifik jika perlu
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

  try {
    const body: GenerateRequestBody = await req.json();
    const {
      url,
      template,
      language,
      badges,
      options = {},
      isInteractive,
      analysisData,
      userAnswers,
      logoUrl,
    } = body;

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!replicateToken) {
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    const githubAnalyzer = new GitHubAnalyzer(githubToken);
    const aiGenerator = new AIReadmeGenerator(replicateToken);

    if (userAnswers && analysisData) {
      console.log("Generating final README with user answers...");
      const readmeContent = await aiGenerator.generateReadme(
        analysisData,
        template,
        language,
        badges,
        userAnswers,
        logoUrl
      );
      const formattedAnalysis = formatAnalysisForResponse(analysisData);

      if (session?.user?.email) {
        const repoInfo = extractGitHubInfo(analysisData.repository.html_url);
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

      return NextResponse.json({
        success: true,
        readme: readmeContent,
        analysis: formattedAnalysis,
      });
    }

    if (!url) {
      return NextResponse.json(
        { error: "GitHub URL is required" },
        { status: 400 }
      );
    }

    const repoInfo = extractGitHubInfo(url);
    if (!repoInfo) {
      return NextResponse.json(
        { error: "Invalid GitHub URL format." },
        { status: 400 }
      );
    }

    console.log(`Starting analysis for ${repoInfo.owner}/${repoInfo.repo}`);
    const analysis = await githubAnalyzer.analyzeProject(
      repoInfo.owner,
      repoInfo.repo
    );
    console.log(`Analysis completed for ${repoInfo.owner}/${repoInfo.repo}`);

    const formattedAnalysis = formatAnalysisForResponse(analysis);

    if (isInteractive) {
      console.log("Interactive mode: generating questions...");
      const questions = await aiGenerator.generateClarifyingQuestions(analysis);
      return NextResponse.json({
        success: true,
        analysis: formattedAnalysis,
        questions,
      });
    }

    console.log("Standard mode: generating README directly...");
    const [readmeContent, architectureDiagram, projectLogo] = await Promise.all(
      [
        aiGenerator.generateReadme(
          analysis,
          template,
          language,
          badges,
          undefined,
          logoUrl
        ),
        options.includeArchitecture
          ? aiGenerator.generateArchitectureDiagram(analysis)
          : Promise.resolve(""),
        options.includeLogo
          ? aiGenerator.generateProjectLogo(analysis)
          : Promise.resolve(""),
      ]
    );

    let finalReadme = readmeContent;
    if (architectureDiagram?.trim())
      finalReadme += `\n\n## 🏛️ Architecture\n\n${architectureDiagram}`;
    if (projectLogo?.trim()) {
      const lines = finalReadme.split("\n");
      const titleIndex = lines.findIndex((line) => line.startsWith("# "));
      if (titleIndex !== -1) {
        lines.splice(
          titleIndex + 1,
          0,
          `\n<div align="center">${projectLogo}</div>\n`
        );
        finalReadme = lines.join("\n");
      }
    }

    if (session?.user?.email) {
      const historyKey = `history:${session.user.email}`;
      const historyEntry: HistoryEntry = {
        id: `${new Date().toISOString()}-${repoInfo.repo}`,
        repoName: `${repoInfo.owner}/${repoInfo.repo}`,
        repoUrl: url,
        readme: finalReadme,
        generatedAt: new Date().toISOString(),
      };
      await kv.lpush(historyKey, historyEntry);
      await kv.ltrim(historyKey, 0, 9);
    }

    return NextResponse.json({
      success: true,
      readme: finalReadme,
      analysis: formattedAnalysis,
    });
  } catch (error) {
    console.error("Enhanced generation error:", error);
    let errorMessage = "Failed to generate README";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes("not found")) statusCode = 404;
      else if (error.message.includes("rate limit")) statusCode = 429;
      else if (error.message.includes("timeout")) statusCode = 408;
    }

    return NextResponse.json(
      { error: errorMessage, code: statusCode },
      { status: statusCode }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "ReadmeGen AI - Enhanced Edition with Agentic Features",
      version: "2.1.0",
      status: "healthy",
    },
    { status: 200 }
  );
}
