import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HistoryEntry } from "@/types";
import { Button } from "@/components/ui/button";

async function HistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/history");
  }

  const historyKey = `history:${session.user.email}`;
  const historyItems = await kv.lrange<HistoryEntry>(historyKey, 0, -1);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Generation History</h1>
      {historyItems && historyItems.length > 0 ? (
        <div className="space-y-4">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="p-4 border rounded-lg bg-card flex justify-between items-center"
            >
              <div>
                <a
                  href={item.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-lg hover:underline"
                >
                  {item.repoName}
                </a>
                <p className="text-sm text-muted-foreground">
                  Generated on {new Date(item.generatedAt).toLocaleString()}
                </p>
              </div>
              <Link href={`/history/${encodeURIComponent(item.id)}`}>
                <Button variant="secondary">View README</Button>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No History Found</h2>
          <p className="text-muted-foreground mt-2">
            Generate your first README to see it here.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button>Generate Now</Button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
