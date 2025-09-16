import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HistoryEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, ExternalLink, GitBranch } from "lucide-react";

async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/history");
  }

  const historyKey = `history:${session.user.email}`;
  const historyItems = await kv.lrange<HistoryEntry>(historyKey, 0, -1);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="terminal-window max-w-6xl mx-auto">
        {/* Terminal Header */}
        <div className="terminal-header">
          <div className="terminal-controls">
            <div className="terminal-dot close"></div>
            <div className="terminal-dot minimize"></div>
            <div className="terminal-dot maximize"></div>
          </div>
          <div className="terminal-title">README History</div>
          <div className="terminal-stats">
            {historyItems?.length || 0} entries
          </div>
        </div>

        {/* Terminal Content */}
        <div className="terminal-content">
          <div className="readme-preview-terminal">
            <div className="flex items-center gap-3 mb-8">
              <GitBranch className="w-8 h-8 terminal-green" />
              <h1 className="text-4xl font-bold terminal-green m-0">
                ~/generation-history
              </h1>
            </div>

            {historyItems && historyItems.length > 0 ? (
              <div className="space-y-4">
                <div className="terminal-comment mb-6">
                  # Found {historyItems.length} README generation
                  {historyItems.length !== 1 ? "s" : ""}
                </div>

                {historyItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded mb-4"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 terminal-cyan" />
                        <div>
                          <a
                            href={item.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-lg terminal-blue hover:terminal-cyan transition-colors flex items-center gap-2"
                          >
                            {item.repoName}
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <div className="terminal-comment text-sm flex items-center gap-2 mt-1">
                            <Calendar className="w-3 h-3" />
                            Generated:{" "}
                            {new Date(item.generatedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={item.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <button className="terminal-button px-3 py-2">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Repository
                          </button>
                        </a>
                        <Link href={`/history/${encodeURIComponent(item.id)}`}>
                          <button className="terminal-button success px-3 py-2">
                            <FileText className="w-4 h-4 mr-2" />
                            View README
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="terminal-window text-center py-12">
                <div className="terminal-content">
                  <div className="p-8 space-y-6">
                    <FileText className="w-16 h-16 mx-auto terminal-comment" />
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold terminal-yellow">
                        $ ls -la ~/readme-history
                      </h2>
                      <div className="terminal-comment">
                        total 0<br />
                        drwxr-xr-x 2 user user 4096{" "}
                        {new Date().toLocaleDateString()} .<br />
                        drwxr-xr-x 12 user user 4096{" "}
                        {new Date().toLocaleDateString()} ..
                      </div>
                      <p className="terminal-comment text-lg">
                        # No README generations found
                      </p>
                      <p className="text-muted-foreground">
                        Generate your first README to populate this directory.
                      </p>
                      <Link href="/">
                        <button className="terminal-button success mt-4">
                          <GitBranch className="w-4 h-4 mr-2" />
                          Generate README
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="terminal-comment mt-6 pt-4 border-t border-border">
              # Use &apos;cd /&apos; to return to main generator
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;
