import { NextRequest, NextResponse } from "next/server";
import { GitHubAnalyzer } from "@/lib/github";
import { AIReadmeGenerator } from "@/lib/ai";
import { extractGitHubInfo } from "@/lib/utils";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { HistoryEntry, ReadmeTemplate } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  try {
    const { url, template }: { url: string; template: ReadmeTemplate } =
      await req.json();

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

    const analysis = await githubAnalyzer.analyzeProject(
      repoInfo.owner,
      repoInfo.repo
    );

    const [readmeContent, architectureDiagram] = await Promise.all([
      aiGenerator.generateReadme(analysis, template),
      aiGenerator.generateArchitectureDiagram(analysis),
    ]);

    const finalReadme = `${readmeContent}\n\n## 🏛️ Architecture\n\n${architectureDiagram}`;

    if (session && session.user?.email) {
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
