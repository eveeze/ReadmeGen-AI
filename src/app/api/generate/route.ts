import { NextRequest, NextResponse } from "next/server";
import { GitHubAnalyzer } from "@/lib/github";
import { AIReadmeGenerator } from "@/lib/ai";
import { extractGitHubInfo } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    console.log("API request received");

    const { url } = await req.json();

    if (!url) {
      console.error("No URL provided in request");
      return NextResponse.json(
        { error: "GitHub URL is required" },
        { status: 400 }
      );
    }

    console.log(`Processing URL: ${url}`);

    const repoInfo = extractGitHubInfo(url);
    if (!repoInfo) {
      console.error(`Invalid GitHub URL format: ${url}`);
      return NextResponse.json(
        {
          error:
            "Invalid GitHub URL format. Please provide a valid GitHub repository URL.",
        },
        { status: 400 }
      );
    }

    console.log(`Extracted repo info: ${repoInfo.owner}/${repoInfo.repo}`);

    // Check for required environment variables
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    const githubToken = process.env.GITHUB_TOKEN;

    if (!replicateToken) {
      console.error("REPLICATE_API_TOKEN not configured");
      return NextResponse.json(
        {
          error:
            "AI service not configured. Please check environment variables.",
        },
        { status: 500 }
      );
    }

    if (!githubToken) {
      console.warn("GITHUB_TOKEN not provided - API rate limits will be lower");
    } else {
      console.log("GitHub token is configured");
    }

    // Initialize services
    console.log("Initializing GitHub analyzer and AI generator");
    const githubAnalyzer = new GitHubAnalyzer(githubToken);
    const aiGenerator = new AIReadmeGenerator(replicateToken);

    // Analyze the repository
    console.log(
      `Starting repository analysis for: ${repoInfo.owner}/${repoInfo.repo}`
    );
    const analysis = await githubAnalyzer.analyzeProject(
      repoInfo.owner,
      repoInfo.repo
    );

    console.log("Repository analysis completed, starting AI generation");

    // Generate README using AI
    const readmeContent = await aiGenerator.generateReadme(analysis);

    console.log(
      `README generated successfully (${readmeContent.length} characters)`
    );

    return NextResponse.json({
      success: true,
      readme: readmeContent,
      analysis: {
        repository: analysis.repository,
        mainLanguage: analysis.mainLanguage,
        frameworks: analysis.frameworks,
        packageManagers: analysis.packageManagers,
        hasDocumentation: analysis.hasDocumentation,
        keyFiles: analysis.keyFiles,
      },
    });
  } catch (error) {
    console.error("Generation error:", error);

    let errorMessage = "Failed to generate README";
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Handle specific error types with more granular status codes
      if (
        error.message.includes("not found") ||
        error.message.includes("private")
      ) {
        statusCode = 404;
      } else if (error.message.includes("rate limit")) {
        statusCode = 429;
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
      } else if (error.message.includes("temporarily unavailable")) {
        statusCode = 503;
      }

      // Log additional context for debugging
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      });
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      message: "ReadmeGen AI API",
      version: "1.0.0",
      status: "healthy",
      endpoints: {
        generate: "POST /api/generate",
      },
      environment: {
        hasGitHubToken: !!process.env.GITHUB_TOKEN,
        hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
        nodeEnv: process.env.NODE_ENV,
      },
    },
    { status: 200 }
  );
}
