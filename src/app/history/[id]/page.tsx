import { getServerSession } from "next-auth/next";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import { kv } from "@vercel/kv";
import { redirect } from "next/navigation";
import { ReadmePreview } from "@/components/ReadmePreview";
import { HistoryEntry } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
      <div className="container mx-auto p-8 text-center">
        <h2 className="text-xl font-semibold">History Item Not Found</h2>
        <p className="text-muted-foreground mt-2">
          This README could not be found in your history.
        </p>
        <Link href="/history" className="mt-4 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link
        href="/history"
        className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to History
      </Link>
      <ReadmePreview content={item.readme} />
    </div>
  );
}

export default HistoryDetailPage;
