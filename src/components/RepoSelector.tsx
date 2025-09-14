"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { UserRepo } from "@/types";
import { Loader2 } from "lucide-react";

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
      <div className="flex items-center text-sm text-muted-foreground p-2">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Fetching your repositories...
      </div>
    );
  }

  if (repos.length === 0) return null;

  return (
    <div className="space-y-2">
      <label htmlFor="repo-selector" className="text-sm font-medium">
        Or select from your repositories
      </label>
      <select
        id="repo-selector"
        onChange={(e) => onSelect(e.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">-- Select a repository --</option>
        {repos.map((repo) => (
          <option key={repo.id} value={repo.url}>
            {repo.name}
          </option>
        ))}
      </select>
    </div>
  );
}
