import { NextRequest, NextResponse } from "next/server";
import { GitHubAnalyzer } from "@/lib/github";
import { AIReadmeGenerator } from "@/lib/ai";
import { extractGitHubInfo } from "@/lib/utils";
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { HistoryEntry } from "@/types";

export async function POST(req: NextRequest) {
  // Dapatkan sesi pengguna, ini tidak akan menghentikan pengguna anonim
  const session = await getServerSession(authOptions);

  try {
    const { url } = await req.json();

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

    // Initialize services
    const githubAnalyzer = new GitHubAnalyzer(githubToken);
    const aiGenerator = new AIReadmeGenerator(replicateToken);

    // Analyze the repository
    const analysis = await githubAnalyzer.analyzeProject(
      repoInfo.owner,
      repoInfo.repo
    );

    // Generate README using AI
    const readmeContent = await aiGenerator.generateReadme(analysis);

    // Jika pengguna login, simpan hasilnya ke riwayat
    if (session && session.user?.email) {
      const historyKey = `history:${session.user.email}`;
      const historyEntry: HistoryEntry = {
        id: `${new Date().toISOString()}-${repoInfo.repo}`,
        repoName: `${repoInfo.owner}/${repoInfo.repo}`,
        repoUrl: url,
        readme: readmeContent,
        generatedAt: new Date().toISOString(),
      };

      await kv.lpush(historyKey, historyEntry);
      await kv.ltrim(historyKey, 0, 9); // Simpan hanya 10 item terakhir
    }

    // Respon sukses tetap sama
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
    // Di sini kita menggunakan penanganan error detail dari kode asli Anda
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

// Fungsi GET Anda tetap sama
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
