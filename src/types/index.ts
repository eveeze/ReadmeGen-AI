export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  topics: string[];
  license?: {
    name: string;
  };
  html_url: string;
  clone_url: string;
}

export interface FileStructure {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
}

export interface ProjectAnalysis {
  repository: GitHubRepo;
  mainLanguage: string;
  frameworks: string[];
  packageManagers: string[];
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  hasDocumentation: boolean;
  structure: FileStructure[];
  keyFiles: string[];
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  progress: string;
}

export interface UserRepo {
  id: number;
  name: string;
  url: string;
}

export interface HistoryEntry {
  id: string;
  repoName: string;
  repoUrl: string;
  readme: string;
  generatedAt: string;
}
