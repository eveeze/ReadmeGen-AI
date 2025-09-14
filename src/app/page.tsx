"use client";

import { useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { ReadmePreview } from "@/components/ReadmePreview";
import { GenerationState } from "@/types";
import { Github, Sparkles, FileText, Zap } from "lucide-react";

export default function HomePage() {
  const { status } = useSession();
  const [url, setUrl] = useState("");
  const [generationState, setGenerationState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    progress: "",
  });
  const [generatedReadme, setGeneratedReadme] = useState<string>("");

  const handleGenerate = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setGenerationState({
      isLoading: true,
      error: null,
      progress: "Analyzing repository...",
    });
    setGeneratedReadme("");

    // Simulate progress dots
    const progressInterval = setInterval(() => {
      setGenerationState((prev) => {
        if (prev.progress.endsWith("...")) {
          return { ...prev, progress: prev.progress.slice(0, -3) };
        }
        return { ...prev, progress: prev.progress + "." };
      });
    }, 500);

    try {
      const response = await axios.post("/api/generate", { url: targetUrl });
      if (response.data.success) {
        setGeneratedReadme(response.data.readme);
        setGenerationState({
          isLoading: false,
          error: null,
          progress: "README generated successfully!",
        });
      } else {
        throw new Error(response.data.error || "Failed to generate README");
      }
    } catch (error) {
      let errorMessage = "An unexpected error occurred";
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      setGenerationState({
        isLoading: false,
        error: errorMessage,
        progress: "",
      });
    } finally {
      clearInterval(progressInterval);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center mb-6">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            <FileText className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
          ReadmeGen AI
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform your GitHub repositories with AI-generated, professional
          README files in seconds
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <div className="flex items-center mb-3">
            <Github className="w-6 h-6 text-blue-600 mr-2" />
            <h3 className="font-semibold">Smart Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically detects frameworks, dependencies, and project
            structure
          </p>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <div className="flex items-center mb-3">
            <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
            <h3 className="font-semibold">AI-Powered</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Leverages IBM Granite AI for intelligent content generation
          </p>
        </div>

        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/20">
          <div className="flex items-center mb-3">
            <Zap className="w-6 h-6 text-indigo-600 mr-2" />
            <h3 className="font-semibold">Lightning Fast</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate comprehensive documentation in under 30 seconds
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <UrlInput
          url={url}
          setUrl={setUrl}
          onGenerate={() => handleGenerate(url)}
          isLoading={generationState.isLoading}
          error={generationState.error}
          progress={generationState.progress}
        />

        {status === "authenticated" && (
          <div className="max-w-2xl mx-auto">
            <RepoSelector
              onSelect={setUrl}
              disabled={generationState.isLoading}
            />
          </div>
        )}

        {generatedReadme && (
          <div className="animate-slide-up">
            <ReadmePreview content={generatedReadme} />
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>Built with ❤️ using Next.js, IBM Granite AI, and GitHub API</p>
      </footer>
    </div>
  );
}
