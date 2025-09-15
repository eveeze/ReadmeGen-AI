// src/types/index.ts
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
  detectedFeatures?: string[];
  complexity?: "low" | "medium" | "high";
  mainFunction?: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  responses?: string[];
}

export interface EnvironmentVariable {
  key: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface Badge {
  name: string;
  url: string;
  link?: string;
  category?:
    | "build"
    | "coverage"
    | "version"
    | "license"
    | "social"
    | "deployment"
    | "custom";
}

// --- UPDATED TYPES ---
export interface CICDJob {
  name: string;
  steps: { name?: string; run?: string }[];
}

export interface CICDConfig {
  platform: "github-actions" | "travis" | "circleci" | "jenkins" | "gitlab";
  configFile: string;
  workflows?: string[];
  jobs?: CICDJob[]; // Parsed jobs from config
  hasTesting?: boolean;
  hasDeployment?: boolean;
}

export interface VercelConfig {
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  nodeVersion?: string;
}

// --- END OF UPDATED TYPES ---

export interface ProjectLogo {
  svgContent: string;
  primaryColor: string;
  secondaryColor: string;
  style: "minimal" | "modern" | "playful" | "professional";
}

export interface TestConfig {
  framework: string;
  testFiles: string[];
  commands: string[];
  coverage?: boolean;
  e2eTests?: boolean;
  unitTests?: boolean;
}

export interface DeploymentConfig {
  platform: "vercel" | "netlify" | "heroku" | "aws" | "docker" | "github-pages";
  configFiles: string[];
  requiresEnv?: boolean;
  buildCommand?: string;
  parsedConfig?: VercelConfig; // Store parsed vercel.json
}

// --- UPDATED ProjectAnalysis ---
export interface CategorizedDependencies {
  [category: string]: string[];
}

export interface ProjectAnalysis {
  repository: GitHubRepo;
  mainLanguage: string;
  frameworks: string[];
  packageManagers: string[];
  dependencies: Record<string, string>;
  categorizedDependencies: CategorizedDependencies; // New categorized dependencies
  scripts: Record<string, string>;
  hasDocumentation: boolean;
  structure: FileStructure[];
  keyFiles: string[];
  fullFileTree: string;
  summarizedCodeSnippets: CodeSnippet[];
  apiEndpoints: ApiEndpoint[];
  envVariables: EnvironmentVariable[];
  badges: Badge[];
  cicdConfig?: CICDConfig;
  testConfig?: TestConfig;
  deploymentConfig?: DeploymentConfig;
  projectLogo?: ProjectLogo;
  contributionGuide: {
    hasCustomGuide: boolean;
    suggestedSteps: string[];
    codeOfConduct: boolean;
  };
}
// --- END OF UPDATED ProjectAnalysis ---

export type ReadmeTemplate = "Dasar" | "Profesional" | "Fun/Creative";
export type ReadmeLanguage = "English" | "Indonesian" | "Spanish" | "Mandarin";

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  progress: string[];
  analysis?: ProjectAnalysis | null; // Add analysis to state
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

export interface AgenticQuestion {
  id: string;
  question: string;
  placeholder?: string;
}
