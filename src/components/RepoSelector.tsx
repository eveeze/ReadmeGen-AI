"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { UserRepo } from "@/types";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Folder, GitBranch, Star, Calendar } from "lucide-react";

interface RepoSelectorProps {
  onSelect: (url: string) => void;
  disabled: boolean;
}

export function RepoSelector({ onSelect, disabled }: RepoSelectorProps) {
  const [repos, setRepos] = useState<UserRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get<UserRepo[]>("/api/user-repos");
        setRepos(data);
      } catch (error) {
        console.error("Could not fetch user repos");
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  if (loading) {
    return (
      <div className="terminal-window bg-card">
        <div className="terminal-header">
          <div className="terminal-controls">
            <div className="terminal-dot close"></div>
            <div className="terminal-dot minimize"></div>
            <div className="terminal-dot maximize"></div>
          </div>
          <div className="terminal-title">repositories.json</div>
        </div>
        <div className="terminal-content p-6">
          <div className="flex items-center space-x-3">
            <LoadingSpinner variant="terminal" />
            <span className="text-sm font-mono text-terminal-comment">
              $ ls -la ~/github/repos
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (repos.length === 0) return null;

  return (
    <div className="terminal-window bg-card">
      <div className="terminal-header">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-4">
            <div className="terminal-controls">
              <div className="terminal-dot close"></div>
              <div className="terminal-dot minimize"></div>
              <div className="terminal-dot maximize"></div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-terminal-blue/20 border border-terminal-blue rounded">
                <Folder className="w-4 h-4 text-terminal-blue" />
              </div>
              <div>
                <div className="text-sm font-bold text-terminal-blue font-mono">
                  ~/github/repositories
                </div>
                <div className="text-xs text-terminal-comment font-mono">
                  {repos.length} repos found
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-terminal-comment font-mono">
            user@github:~$
          </div>
        </div>
      </div>

      <div className="terminal-content p-6">
        <div className="space-y-2">
          <label
            htmlFor="repo-selector"
            className="text-sm font-medium font-mono text-terminal-yellow"
          >
            $ select repository --interactive
          </label>

          <div className="relative">
            <select
              id="repo-selector"
              onChange={(e) => onSelect(e.target.value)}
              disabled={disabled}
              className="terminal-input w-full bg-input border border-border text-foreground font-mono"
            >
              <option value="" className="bg-background text-terminal-comment">
                -- SELECT REPOSITORY --
              </option>
              {repos.map((repo) => (
                <option
                  key={repo.id}
                  value={repo.url}
                  className="bg-background text-foreground"
                >
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Repository stats */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2 text-xs font-mono">
            <GitBranch className="w-3 h-3 text-terminal-green" />
            <span className="text-terminal-comment">total:</span>
            <span className="text-terminal-green">{repos.length}</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Star className="w-3 h-3 text-terminal-yellow" />
            <span className="text-terminal-comment">starred:</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono">
            <Calendar className="w-3 h-3 text-terminal-cyan" />
            <span className="text-terminal-comment">updated:</span>
            <span className="text-terminal-cyan">recently</span>
          </div>
        </div>

        {/* Terminal prompt */}
        <div className="mt-4 text-xs font-mono text-terminal-comment">
          <span className="text-terminal-green">$</span> cat selected_repo.url
          <span className="terminal-cursor">_</span>
        </div>
      </div>
    </div>
  );
}
