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

export interface CodeSnippet {
  fileName: string;
  content: string;
  summary: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
}

export interface EnvironmentVariable {
  key: string;
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
  fullFileTree: string;
  summarizedCodeSnippets: CodeSnippet[];
  apiEndpoints: ApiEndpoint[];
  envVariables: EnvironmentVariable[];
}

export type ReadmeTemplate = "Dasar" | "Profesional" | "Fun/Creative";

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
