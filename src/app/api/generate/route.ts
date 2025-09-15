import { NextRequest, NextResponse } from "next/server";
import { GitHubAnalyzer } from "@/lib/github";
import { AIReadmeGenerator } from "@/lib/ai";
import { extractGitHubInfo } from "@/lib/utils";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { HistoryEntry, ReadmeTemplate, ReadmeLanguage, Badge } from "@/types";

interface HistoryMetadata {
  template: ReadmeTemplate;
  language: ReadmeLanguage;
  customBadges: number;
  analysisFeatures: string[];
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  try {
    const {
      url,
      template,
      language,
      badges,
      options = {},
    }: {
      url: string;
      template: ReadmeTemplate;
      language: ReadmeLanguage;
      badges: Badge[];
      options?: {
        includeArchitecture?: boolean;
        includeLogo?: boolean;
        deepCodeAnalysis?: boolean;
        enhancedTesting?: boolean;
      };
    } = await req.json();

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

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!replicateToken) {
      console.error("REPLICATE_API_TOKEN not configured");
      return NextResponse.json(
        { error: "AI service not configured." },
        { status: 500 }
      );
    }

    const githubAnalyzer = new GitHubAnalyzer(githubToken);
    const aiGenerator = new AIReadmeGenerator(replicateToken);

    console.log(
      `Starting enhanced analysis for ${repoInfo.owner}/${repoInfo.repo}`
    );

    // Enhanced analysis with all new features
    const analysis = await githubAnalyzer.analyzeProject(
      repoInfo.owner,
      repoInfo.repo
    );

    console.log(`Analysis completed. Detected features:
    - Framework: ${analysis.frameworks.join(", ")}
    - CI/CD: ${analysis.cicdConfig?.platform || "None"}
    - Testing: ${analysis.testConfig?.framework || "None"}
    - Deployment: ${analysis.deploymentConfig?.platform || "None"}
    - API Endpoints: ${analysis.apiEndpoints.length}
    - Environment Variables: ${analysis.envVariables.length}
    `);

    // Generate components in parallel for better performance
    const generatePromises = [];

    // Always generate README
    generatePromises.push(
      aiGenerator.generateReadme(analysis, template, language, badges)
    );

    // Generate architecture diagram if requested (default: true)
    if (options.includeArchitecture !== false) {
      generatePromises.push(aiGenerator.generateArchitectureDiagram(analysis));
    } else {
      generatePromises.push(Promise.resolve(""));
    }

    // Generate logo if requested
    if (options.includeLogo) {
      generatePromises.push(aiGenerator.generateProjectLogo(analysis));
    } else {
      generatePromises.push(Promise.resolve(""));
    }

    const [readmeContent, architectureDiagram, projectLogo] = await Promise.all(
      generatePromises
    );

    // Combine README with additional sections
    let finalReadme = readmeContent;

    // Add architecture diagram if available
    if (architectureDiagram && architectureDiagram.trim()) {
      finalReadme += `\n\n## 🏛️ Architecture\n\n${architectureDiagram}`;
    }

    // Add project logo if available
    if (projectLogo && projectLogo.trim()) {
      // Insert logo at the beginning after title
      const lines = finalReadme.split("\n");
      const titleIndex = lines.findIndex((line) => line.startsWith("# "));
      if (titleIndex !== -1 && titleIndex + 1 < lines.length) {
        lines.splice(
          titleIndex + 2,
          0,
          "",
          '<div align="center">',
          projectLogo,
          "</div>",
          ""
        );
        finalReadme = lines.join("\n");
      }
    }

    // Enhanced success response with detailed analysis
    const responseData = {
      success: true,
      readme: finalReadme,
      analysis: {
        repository: analysis.repository,
        mainLanguage: analysis.mainLanguage,
        frameworks: analysis.frameworks,
        packageManagers: analysis.packageManagers,
        hasDocumentation: analysis.hasDocumentation,
        keyFiles: analysis.keyFiles,
        badges: analysis.badges,

        // NEW: Enhanced analysis data
        features: {
          cicd: analysis.cicdConfig
            ? {
                platform: analysis.cicdConfig.platform,
                hasAutomatedTesting: analysis.cicdConfig.hasTesting,
                hasAutomatedDeployment: analysis.cicdConfig.hasDeployment,
                workflows: analysis.cicdConfig.workflows?.length || 0,
              }
            : null,

          testing: analysis.testConfig
            ? {
                framework: analysis.testConfig.framework,
                hasUnitTests: analysis.testConfig.unitTests,
                hasE2ETests: analysis.testConfig.e2eTests,
                hasCoverage: analysis.testConfig.coverage,
                testCommands: analysis.testConfig.commands.length,
              }
            : null,

          deployment: analysis.deploymentConfig
            ? {
                platform: analysis.deploymentConfig.platform,
                requiresEnvVars: analysis.deploymentConfig.requiresEnv,
                hasBuildProcess: !!analysis.deploymentConfig.buildCommand,
              }
            : null,

          api: {
            endpointCount: analysis.apiEndpoints.length,
            methods: [...new Set(analysis.apiEndpoints.map((e) => e.method))],
          },

          environment: {
            variableCount: analysis.envVariables.length,
            requiredVars: analysis.envVariables.filter((v) => v.required)
              .length,
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
                  (snippet) => snippet.detectedFeatures || []
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

        // Metadata for frontend display
        metadata: {
          generatedAt: new Date().toISOString(),
          analysisVersion: "2.0.0",
          featuresDetected: [
            analysis.cicdConfig && "CI/CD Pipeline",
            analysis.testConfig && "Testing Framework",
            analysis.deploymentConfig && "Deployment Config",
            analysis.apiEndpoints.length > 0 && "API Endpoints",
            analysis.envVariables.length > 0 && "Environment Configuration",
            analysis.contributionGuide.hasCustomGuide &&
              "Contribution Guidelines",
          ].filter(Boolean) as string[],
        },
      },
    };

    // Save to history with enhanced metadata
    if (session && session.user?.email) {
      const historyKey = `history:${session.user.email}`;
      const historyEntry: HistoryEntry & {
        metadata?: HistoryMetadata;
        features?: string[];
      } = {
        id: `${new Date().toISOString()}-${repoInfo.repo}`,
        repoName: `${repoInfo.owner}/${repoInfo.repo}`,
        repoUrl: url,
        readme: finalReadme,
        generatedAt: new Date().toISOString(),

        // Enhanced history metadata
        metadata: {
          template,
          language,
          customBadges: badges.length,
          analysisFeatures: responseData.analysis.metadata.featuresDetected,
        },
        features: responseData.analysis.metadata.featuresDetected,
      };

      await kv.lpush(historyKey, historyEntry);
      await kv.ltrim(historyKey, 0, 9); // Keep last 10 entries
    }

    console.log(
      `README generation completed successfully for ${repoInfo.owner}/${repoInfo.repo}`
    );
    console.log(
      `Features detected: ${responseData.analysis.metadata.featuresDetected.join(
        ", "
      )}`
    );

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Enhanced generation error:", error);
    let errorMessage = "Failed to generate README";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Enhanced error categorization
      if (
        error.message.includes("not found") ||
        error.message.includes("private")
      ) {
        statusCode = 404;
      } else if (error.message.includes("rate limit")) {
        statusCode = 429;
        errorMessage +=
          ". Try again in a few minutes or add a GitHub token for higher limits.";
      } else if (
        error.message.includes("forbidden") ||
        error.message.includes("access")
      ) {
        statusCode = 403;
      } else if (
        error.message.includes("unauthorized") ||
        error.message.includes("invalid")
      ) {
        statusCode = 401;
      } else if (
        error.message.includes("timeout") ||
        error.message.includes("network")
      ) {
        statusCode = 408;
        errorMessage =
          "Request timeout. The repository might be too large or GitHub is experiencing issues.";
      } else if (error.message.includes("temporarily unavailable")) {
        statusCode = 503;
        errorMessage =
          "AI service is temporarily unavailable. Please try again later.";
      } else if (
        error.message.includes("credits") ||
        error.message.includes("billing")
      ) {
        statusCode = 402;
        errorMessage = "AI service quota exceeded. Please contact support.";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        code: statusCode,
        timestamp: new Date().toISOString(),
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? {
                message: error.message,
                stack: error.stack,
              }
            : undefined,
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "ReadmeGen AI - Enhanced Edition",
      version: "2.0.0",
      status: "healthy",
      endpoints: {
        generate: "POST /api/generate",
        userRepos: "GET /api/user-repos",
        history: "GET /api/history",
      },
      features: [
        "AI-powered README generation",
        "Automatic CI/CD detection",
        "Test framework analysis",
        "Deployment configuration detection",
        "API endpoint extraction",
        "Environment variable discovery",
        "Project logo generation",
        "Enhanced code analysis",
        "Custom contribution guides",
        "Architecture diagram generation",
        "Multi-language support",
        "Template customization",
        "Custom badge support",
      ],
      environment: {
        hasGitHubToken: !!process.env.GITHUB_TOKEN,
        hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
        nodeEnv: process.env.NODE_ENV,
        version: "2.0.0",
        timestamp: new Date().toISOString(),
      },
      limits: {
        maxRepositorySize: "100MB",
        maxFileAnalysis: 10,
        maxApiEndpoints: 20,
        maxEnvVariables: 50,
        historyEntries: 10,
      },
    },
    { status: 200 }
  );
}
