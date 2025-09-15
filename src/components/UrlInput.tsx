"use client";

import { useState } from "react";
import {
  Github,
  Zap,
  Terminal,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [isValidUrl, setIsValidUrl] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError("Repository URL required");
      return;
    }
    if (!validateGitHubUrl(url)) {
      setUrlError("Invalid GitHub repository URL");
      return;
    }
    setUrlError("");
    onGenerate(url);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setUrlError("");
    setIsValidUrl(validateGitHubUrl(newUrl));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="terminal-window bg-card shadow-2xl">
        {/* Terminal Header */}
        <div className="terminal-header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-4">
              <div className="terminal-controls">
                <div className="terminal-dot close"></div>
                <div className="terminal-dot minimize"></div>
                <div className="terminal-dot maximize"></div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="p-1.5 bg-terminal-green/20 border border-terminal-green rounded">
                  <Terminal className="w-4 h-4 text-terminal-green" />
                </div>
                <div>
                  <div className="text-sm font-bold text-terminal-green font-mono">
                    readme-generator.sh
                  </div>
                  <div className="text-xs text-terminal-comment font-mono">
                    ai-powered analysis
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs text-terminal-comment font-mono">
              user@readmegen:~$
            </div>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="terminal-content p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Terminal prompt */}
            <div className="text-sm font-mono text-terminal-comment mb-4">
              <span className="text-terminal-green">$</span> readmegen --analyze
              --url
            </div>

            {/* URL Input */}
            <div className="space-y-3">
              <label
                htmlFor="github-url"
                className="text-sm font-medium font-mono text-terminal-yellow flex items-center space-x-2"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Repository URL</span>
              </label>

              <div className="relative">
                <div className="absolute left-3 top-3 h-4 w-4 text-terminal-comment">
                  <Github className="h-4 w-4" />
                </div>
                <Input
                  id="github-url"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={url}
                  onChange={handleUrlChange}
                  className={`terminal-input pl-10 ${
                    url &&
                    (isValidUrl
                      ? "border-terminal-green"
                      : "border-terminal-red")
                  }`}
                  disabled={isLoading}
                />
                {url && (
                  <div className="absolute right-3 top-3">
                    {isValidUrl ? (
                      <CheckCircle className="h-4 w-4 text-terminal-green" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-terminal-red" />
                    )}
                  </div>
                )}
              </div>

              {/* URL Validation */}
              {urlError && (
                <div className="flex items-center space-x-2 text-sm text-terminal-red font-mono">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Error: {urlError}</span>
                </div>
              )}

              {url && isValidUrl && !urlError && (
                <div className="flex items-center space-x-2 text-sm text-terminal-green font-mono">
                  <CheckCircle className="w-4 h-4" />
                  <span>Valid GitHub repository URL</span>
                </div>
              )}
            </div>

            {/* Generate Button */}
            <Button
              type="submit"
              disabled={isLoading || !url.trim() || !isValidUrl}
              className={`w-full terminal-button text-lg py-6 ${
                isLoading
                  ? "bg-terminal-comment"
                  : "hover:bg-terminal-green hover:text-background hover:border-terminal-green"
              }`}
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <LoadingSpinner variant="terminal" size={16} />
                  <span className="font-mono">analyzing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5" />
                  <span className="font-mono">generate README.md</span>
                </div>
              )}
            </Button>
          </form>

          {/* Progress Display */}
          {isLoading && progress && (
            <div className="mt-6 terminal-window bg-secondary border border-border">
              <div className="terminal-content p-4">
                <div className="flex items-start space-x-3">
                  <LoadingSpinner variant="terminal" />
                  <div className="flex-1">
                    <div className="text-sm font-mono text-terminal-cyan mb-2">
                      [PROCESS] AI Analysis Pipeline
                    </div>
                    <div className="text-sm font-mono text-foreground">
                      {progress}
                    </div>
                    <div className="mt-2 text-xs font-mono text-terminal-comment">
                      powered by IBM Granite AI
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-6 terminal-window bg-terminal-red/10 border border-terminal-red">
              <div className="terminal-content p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-terminal-red flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-mono text-terminal-red font-bold mb-1">
                      [ERROR] Generation Failed
                    </div>
                    <div className="text-sm font-mono text-foreground">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terminal Footer */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-terminal-comment">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-terminal-green rounded-full animate-pulse"></div>
                <span>AI-powered analysis</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-terminal-blue rounded-full animate-pulse"></div>
                <span>GitHub API integration</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-terminal-yellow rounded-full animate-pulse"></div>
                <span>Professional templates</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="text-xs text-terminal-comment font-mono">
                $ readmegen --version
              </div>
              <div className="text-xs text-terminal-green font-mono">
                v2.0.0-terminal • powered by IBM Granite AI
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
