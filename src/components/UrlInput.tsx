"use client";

import { useState } from "react";
import { Github, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { validateGitHubUrl } from "@/lib/utils";

interface UrlInputProps {
  onGenerate: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  progress: string;
  url: string;
  setUrl: (url: string) => void;
}

export function UrlInput({
  onGenerate,
  isLoading,
  error,
  progress,
  url,
  setUrl,
}: UrlInputProps) {
  const [urlError, setUrlError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError("Please enter a GitHub URL");
      return;
    }
    if (!validateGitHubUrl(url)) {
      setUrlError("Please enter a valid GitHub repository URL");
      return;
    }
    setUrlError("");
    onGenerate(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (urlError) setUrlError("");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        {/* Judul dan deskripsi tidak perlu diubah */}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="github-url" className="text-sm font-medium">
              GitHub Repository URL
            </label>
            <div className="relative">
              <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="github-url"
                type="url"
                placeholder="https://github.com/username/repository"
                value={url}
                onChange={handleUrlChange}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            {urlError && <p className="text-sm text-red-500">{urlError}</p>}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate README
              </>
            )}
          </Button>
        </form>

        {isLoading && progress && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {progress}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="mt-6 text-xs text-muted-foreground text-center">
          <p>Powered by IBM Granite AI • GitHub API</p>
        </div>
      </CardContent>
    </Card>
  );
}
