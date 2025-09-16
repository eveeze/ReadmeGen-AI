import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { redirect } from "next/navigation";
import { ReadmePreview } from "@/components/ReadmePreview";
import { HistoryEntry } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Calendar,
  User,
} from "lucide-react";

async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Await 'params' untuk mendapatkan nilainya
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    redirect("/api/auth/signin");
  }

  // 2. Gunakan 'id' yang sudah di-await
  const decodedId = decodeURIComponent(id);
  const historyKey = `history:${session.user.email}`;
  const historyItems = await kv.lrange<HistoryEntry>(historyKey, 0, -1);
  const item = historyItems.find((h) => h.id === decodedId);

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <div className="terminal-window max-w-4xl mx-auto my-8">
          <div className="terminal-header">
            <div className="terminal-controls">
              <div className="terminal-dot close"></div>
              <div className="terminal-dot minimize"></div>
              <div className="terminal-dot maximize"></div>
            </div>
            <div className="terminal-title">Error 404</div>
            <div className="terminal-stats">Not Found</div>
          </div>

          <div className="terminal-content">
            <pre className="readme-preview-terminal text-center py-12">
              <div className="space-y-6">
                <FileText className="w-16 h-16 mx-auto terminal-red" />
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold terminal-red">
                    $ cat README_NOT_FOUND.md
                  </h2>
                  <div className="terminal-comment">
                    cat: README_NOT_FOUND.md: No such file or directory
                  </div>
                  <p className="terminal-comment text-lg">
                    # History item not found in database
                  </p>
                  <p className="text-muted-foreground">
                    This README could not be found in your generation history.
                  </p>
                  <Link href="/history">
                    <button className="terminal-button mt-4">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      cd ../history
                    </button>
                  </Link>
                </div>
              </div>
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Navigation Header */}
      <div className="terminal-window max-w-6xl mx-auto mb-4">
        <div className="terminal-header">
          <div className="terminal-controls">
            <div className="terminal-dot close"></div>
            <div className="terminal-dot minimize"></div>
            <div className="terminal-dot maximize"></div>
          </div>
          <div className="terminal-title">{item.repoName} - README.md</div>
          <div className="terminal-stats">
            Generated {new Date(item.generatedAt).toLocaleDateString()}
          </div>
        </div>

        <div className="terminal-content">
          <div className="px-6 py-3 flex items-center justify-between border-b border-border">
            <Link
              href="/history"
              className="inline-flex items-center text-sm font-mono terminal-blue hover:terminal-cyan transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              cd ../history
            </Link>

            <div className="flex items-center gap-4 text-sm terminal-comment">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(item.generatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{session.user?.email}</span>
              </div>
              <a
                href={item.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 terminal-blue hover:terminal-cyan transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Repository</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* README Content */}
      <ReadmePreview content={item.readme} />

      {/* Terminal Footer */}
      <div className="terminal-window max-w-6xl mx-auto">
        <div className="terminal-content">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="terminal-comment">
                $ wc -l README.md
                <br />
                {item.readme.split("\n").length} README.md
              </div>
              <div className="flex gap-2">
                <Link href="/history">
                  <button className="terminal-button">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to History
                  </button>
                </Link>
                <Link href="/">
                  <button className="terminal-button success">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate New
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetailPage;
