"use client";

import { useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import { UrlInput } from "@/components/UrlInput";
import { RepoSelector } from "@/components/RepoSelector";
import { ReadmePreview } from "@/components/ReadmePreview";
import { BadgeGenerator } from "@/components/BadgeGenerator";
import {
  GenerationState,
  ReadmeTemplate,
  ReadmeLanguage,
  Badge,
} from "@/types";
import { Github, Sparkles, FileText, Zap } from "lucide-react";

export default function HomePage() {
  const { status } = useSession();
  const [url, setUrl] = useState("");
  const [template, setTemplate] = useState<ReadmeTemplate>("Profesional");
  const [language, setLanguage] = useState<ReadmeLanguage>("English");
  const [badges, setBadges] = useState<Badge[]>([]);
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

    try {
      const response = await axios.post("/api/generate", {
        url: targetUrl,
        template,
        language,
        badges, // Mengirim state badge saat ini (termasuk yang kustom)
      });

      if (response.data.success) {
        setGeneratedReadme(response.data.readme);

        // --- INI BAGIAN YANG DIPERBAIKI ---
        // Kita gabungkan badge dari server dengan badge kustom yang sudah ada,
        // untuk menghindari duplikasi dan penimpaan.
        const serverBadges = response.data.analysis.badges || [];
        setBadges((currentBadges) => {
          const customBadges = currentBadges.filter(
            (b) => !serverBadges.some((sb: Badge) => sb.name === b.name)
          );
          return [...serverBadges, ...customBadges];
        });
        // --- AKHIR BAGIAN PERBAIKAN ---

        setGenerationState({
          isLoading: false,
          error: null,
          progress: "README generated successfully!",
        });
      } else {
        throw new Error(response.data.error || "Failed to generate README");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "An unexpected error occurred";
      setGenerationState({
        isLoading: false,
        error: errorMessage,
        progress: "",
      });
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
      <div className="space-y-6">
        <UrlInput
          url={url}
          setUrl={setUrl}
          onGenerate={() => handleGenerate(url)}
          isLoading={generationState.isLoading}
          error={generationState.error}
          progress={generationState.progress}
        />
        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="template-selector" className="text-sm font-medium">
              Choose Template
            </label>
            <select
              id="template-selector"
              value={template}
              onChange={(e) => setTemplate(e.target.value as ReadmeTemplate)}
              disabled={generationState.isLoading}
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="Profesional">Professional</option>
              <option value="Dasar">Basic</option>
              <option value="Fun/Creative">Fun/Creative</option>
            </select>
          </div>
          <div>
            <label htmlFor="language-selector" className="text-sm font-medium">
              Output Language
            </label>
            <select
              id="language-selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value as ReadmeLanguage)}
              disabled={generationState.isLoading}
              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="English">English</option>
              <option value="Indonesian">Indonesian</option>
              <option value="Spanish">Spanish</option>
              <option value="Mandarin">Mandarin</option>
            </select>
          </div>
        </div>
        {status === "authenticated" && (
          <div className="max-w-2xl mx-auto">
            <RepoSelector
              onSelect={setUrl}
              disabled={generationState.isLoading}
            />
          </div>
        )}
        <div className="max-w-2xl mx-auto">
          <BadgeGenerator badges={badges} setBadges={setBadges} />
        </div>
        {generatedReadme && (
          <div className="animate-slide-up">
            <ReadmePreview content={generatedReadme} />
          </div>
        )}
      </div>
    </div>
  );
}
