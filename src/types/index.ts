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
  // New: AI-generated analysis
  detectedFeatures?: string[];
  complexity?: "low" | "medium" | "high";
  mainFunction?: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  description: string;
  // Enhanced with parameters and responses
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

// New: CI/CD Detection
export interface CICDConfig {
  platform: "github-actions" | "travis" | "circleci" | "jenkins" | "gitlab";
  configFile: string;
  workflows?: string[];
  hasTesting?: boolean;
  hasDeployment?: boolean;
}

// New: Project Logo Generation
export interface ProjectLogo {
  svgContent: string;
  primaryColor: string;
  secondaryColor: string;
  style: "minimal" | "modern" | "playful" | "professional";
}

// New: Enhanced Test Detection
export interface TestConfig {
  framework: string;
  testFiles: string[];
  commands: string[];
  coverage?: boolean;
  e2eTests?: boolean;
  unitTests?: boolean;
}

// New: Deployment Detection
export interface DeploymentConfig {
  platform: "vercel" | "netlify" | "heroku" | "aws" | "docker" | "github-pages";
  configFiles: string[];
  requiresEnv?: boolean;
  buildCommand?: string;
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
  badges: Badge[];

  // New features
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

export type ReadmeTemplate = "Dasar" | "Profesional" | "Fun/Creative";
export type ReadmeLanguage = "English" | "Indonesian" | "Spanish" | "Mandarin";

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

export interface AgenticQuestion {
  id: string;
  question: string;
  placeholder?: string;
}
