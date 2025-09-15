// src/lib/github.ts
import axios from "axios";
import yaml from "js-yaml";
import {
  GitHubRepo,
  FileStructure,
  ProjectAnalysis,
  CodeSnippet,
  ApiEndpoint,
  EnvironmentVariable,
  Badge,
  CICDConfig,
  CICDJob,
  TestConfig,
  DeploymentConfig,
  ProjectLogo,
  CategorizedDependencies,
  VercelConfig,
} from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

// Interface untuk package.json
interface PackageJson {
  scripts?: { [key: string]: string };
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
}

// Interface untuk struktur dasar file workflow GitHub Actions
interface GitHubWorkflow {
  name?: string;
  jobs?: {
    [jobName: string]: {
      name?: string;
      steps?: Array<{
        name?: string;
        run?: string;
      }>;
    };
  };
}

type ProgressCallback = (message: string) => void;

export class GitHubAnalyzer {
  private token?: string;
  private progressCallback: ProgressCallback;

  constructor(token?: string, progressCallback: ProgressCallback = () => {}) {
    this.token = token;
    this.progressCallback = progressCallback;
  }

  private getHeaders() {
    return this.token
      ? {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReadmeGen-AI/2.0.0",
        }
      : {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReadmeGen-AI/2.0.0",
        };
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    this.progressCallback(`Fetching repository data for ${owner}/${repo}...`);
    try {
      console.log(`Fetching repository: ${owner}/${repo}`);
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );
      this.progressCallback(`✓ Successfully fetched repository data.`);
      return {
        name: response.data.name,
        description: response.data.description || "",
        language: response.data.language || "Unknown",
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        topics: response.data.topics || [],
        license: response.data.license,
        html_url: response.data.html_url,
        clone_url: response.data.clone_url,
      };
    } catch (error) {
      console.error(`Error fetching repository ${owner}/${repo}:`, error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;
        console.error(
          `GitHub API Error - Status: ${status}, Message: ${message}`
        );
        switch (status) {
          case 404:
            throw new Error("Repository not found or is private");
          case 403:
            if (message.includes("rate limit")) {
              throw new Error(
                "GitHub API rate limit exceeded. Please try again later or add a GitHub token."
              );
            }
            throw new Error(`GitHub API access forbidden: ${message}`);
          case 401:
            throw new Error("GitHub token is invalid or expired");
          default:
            throw new Error(`GitHub API error (${status}): ${message}`);
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      throw new Error(
        `Failed to fetch repository information: ${errorMessage}`
      );
    }
  }

  async getFileStructure(
    owner: string,
    repo: string,
    path = ""
  ): Promise<FileStructure[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders(), timeout: 10000 }
      );
      if (!Array.isArray(response.data)) {
        return [];
      }
      return response.data.map(
        (item: {
          name: string;
          path: string;
          type: "dir" | "file";
          size: number;
        }) => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size,
        })
      );
    } catch {
      return [];
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string | null> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        { headers: this.getHeaders(), timeout: 10000 }
      );
      if (response.data.content) {
        return Buffer.from(response.data.content, "base64").toString("utf-8");
      }
      return null;
    } catch {
      return null;
    }
  }

  private categorizeDependencies(
    dependencies: Record<string, string>
  ): CategorizedDependencies {
    const categories: Record<string, string[]> = {
      "UI Framework": ["react", "vue", "angular", "svelte", "next", "solid-js"],
      "State Management": [
        "redux",
        "zustand",
        "mobx",
        "vuex",
        "recoil",
        "pinia",
      ],
      Styling: [
        "tailwindcss",
        "styled-components",
        "sass",
        "less",
        "emotion",
        "postcss",
      ],
      Testing: [
        "jest",
        "mocha",
        "cypress",
        "playwright",
        "vitest",
        "testing-library",
      ],
      "Linting/Formatting": ["eslint", "prettier", "stylelint"],
      "ORM/ODM": ["prisma", "mongoose", "sequelize", "typeorm", "drizzle-orm"],
      "API/GraphQL": [
        "axios",
        "graphql",
        "apollo-client",
        "react-query",
        "trpc",
        "swr",
      ],
      "Build Tools": [
        "webpack",
        "vite",
        "rollup",
        "esbuild",
        "turbopack",
        "parcel",
      ],
    };

    const categorized: CategorizedDependencies = {};

    for (const dep in dependencies) {
      let foundCategory = "Other";
      for (const category in categories) {
        if (categories[category].some((keyword) => dep.includes(keyword))) {
          foundCategory = category;
          break;
        }
      }
      if (!categorized[foundCategory]) {
        categorized[foundCategory] = [];
      }
      categorized[foundCategory].push(dep);
    }
    return categorized;
  }

  private async detectCICD(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<CICDConfig | undefined> {
    const githubActionsFiles = structure.filter(
      (file) =>
        file.path.startsWith(".github/workflows/") &&
        (file.path.endsWith(".yml") || file.path.endsWith(".yaml"))
    );

    if (githubActionsFiles.length > 0) {
      this.progressCallback("Parsing GitHub Actions workflows...");
      const workflows: string[] = [];
      const jobs: CICDJob[] = [];
      let hasTesting = false;
      let hasDeployment = false;

      for (const file of githubActionsFiles.slice(0, 3)) {
        // Limit to 3 files
        const content = await this.getFileContent(owner, repo, file.path);
        if (content) {
          try {
            // FIX 1: Using a specific type instead of 'any'
            const workflowConfig = yaml.load(content) as GitHubWorkflow;
            workflows.push(
              workflowConfig.name || file.name.replace(/\.ya?ml$/, "")
            );

            if (workflowConfig.jobs) {
              for (const jobName in workflowConfig.jobs) {
                const job = workflowConfig.jobs[jobName];
                // FIX 2: Defining the type for 'step' instead of 'any'
                const jobSteps =
                  job.steps?.map((step: { name?: string; run?: string }) => ({
                    name: step.name,
                    run: step.run,
                  })) || [];
                jobs.push({ name: job.name || jobName, steps: jobSteps });

                const jobContent = JSON.stringify(job).toLowerCase();
                if (jobContent.includes("test")) hasTesting = true;
                if (jobContent.includes("deploy")) hasDeployment = true;
              }
            }
          } catch (e) {
            console.warn(`Could not parse YAML file: ${file.path}`, e);
          }
        }
      }

      return {
        platform: "github-actions",
        configFile: ".github/workflows",
        workflows,
        jobs,
        hasTesting,
        hasDeployment,
      };
    }

    return undefined;
  }

  private async detectDeploymentConfig(
    owner: string,
    repo: string,
    structure: FileStructure[],
    packageJson?: PackageJson | null
  ): Promise<DeploymentConfig | undefined> {
    const vercelFile = structure.find((f) => f.name === "vercel.json");
    if (vercelFile) {
      this.progressCallback("Parsing vercel.json...");
      const content = await this.getFileContent(owner, repo, vercelFile.path);
      let parsedConfig: VercelConfig | undefined = undefined;
      if (content) {
        try {
          const config = JSON.parse(content);
          parsedConfig = {
            framework: config.framework,
            buildCommand: config.build?.command,
            outputDirectory: config.outputDirectory,
            nodeVersion: config.engines?.node,
          };
        } catch (e) {
          console.warn("Could not parse vercel.json", e);
        }
      }
      return {
        platform: "vercel",
        configFiles: ["vercel.json"],
        requiresEnv: structure.some((f) => f.name.includes(".env")),
        buildCommand: parsedConfig?.buildCommand || packageJson?.scripts?.build,
        parsedConfig,
      };
    }

    if (structure.some((f) => f.name === "netlify.toml")) {
      return {
        platform: "netlify",
        configFiles: ["netlify.toml"],
        requiresEnv: structure.some((f) => f.name.includes(".env")),
        buildCommand: packageJson?.scripts?.build,
      };
    }

    if (structure.some((f) => f.name.toLowerCase() === "procfile")) {
      return {
        platform: "heroku",
        configFiles: ["Procfile"],
        requiresEnv: true,
      };
    }

    if (structure.some((f) => f.name.toLowerCase() === "dockerfile")) {
      return { platform: "docker", configFiles: ["Dockerfile"] };
    }

    return undefined;
  }

  private async detectTestConfig(
    owner: string,
    repo: string,
    structure: FileStructure[],
    packageJson?: PackageJson | null
  ): Promise<TestConfig | undefined> {
    const testFiles = structure.filter((file) => {
      const path = file.path.toLowerCase();
      const name = file.name.toLowerCase();
      return (
        path.includes("test") ||
        path.includes("spec") ||
        name.includes("test") ||
        name.includes("spec") ||
        path.includes("__tests__") ||
        path.includes("cypress") ||
        path.includes("e2e")
      );
    });

    if (testFiles.length === 0 && !packageJson?.scripts) return undefined;

    let framework = "Unknown";
    const commands: string[] = [];
    let coverage = false;
    let e2eTests = false;
    let unitTests = false;

    if (packageJson && packageJson.scripts) {
      const scripts = packageJson.scripts;
      if (scripts.test) commands.push("npm test");
      if (scripts["test:unit"]) {
        commands.push("npm run test:unit");
        unitTests = true;
      }
      if (scripts["test:e2e"]) {
        commands.push("npm run test:e2e");
        e2eTests = true;
      }
      if (scripts["test:coverage"] || scripts.coverage) {
        coverage = true;
      }

      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };
      if (allDeps.jest) framework = "Jest";
      else if (allDeps.mocha) framework = "Mocha";
      else if (allDeps.cypress) framework = "Cypress";
      else if (allDeps.playwright) framework = "Playwright";
      else if (allDeps.vitest) framework = "Vitest";
    }

    if (
      testFiles.some(
        (f) => f.name.includes(".test.") || f.name.includes(".spec.")
      )
    ) {
      unitTests = true;
    }
    if (
      testFiles.some(
        (f) => f.path.includes("e2e") || f.path.includes("cypress")
      )
    ) {
      e2eTests = true;
    }

    if (
      framework !== "Unknown" ||
      commands.length > 0 ||
      unitTests ||
      e2eTests
    ) {
      return {
        framework,
        testFiles: testFiles.slice(0, 10).map((f) => f.path),
        commands: commands.length > 0 ? commands : ["npm test"],
        coverage,
        e2eTests,
        unitTests,
      };
    }

    return undefined;
  }

  private generateProjectLogo(repository: GitHubRepo): ProjectLogo {
    const firstLetter = repository.name.charAt(0).toUpperCase();
    const colors = this.getColorScheme(repository.language, repository.topics);

    const svgContent = `
      <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primaryColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondaryColor};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="12" fill="url(#grad)"/>
        <text x="32" y="42" font-family="Arial, sans-serif" font-size="28" font-weight="bold"
              text-anchor="middle" fill="white">${firstLetter}</text>
      </svg>
    `;

    return {
      svgContent,
      primaryColor: colors.primaryColor,
      secondaryColor: colors.secondaryColor,
      style: "modern",
    };
  }

  private getColorScheme(
    language: string,
    topics: string[]
  ): { primaryColor: string; secondaryColor: string } {
    const languageColors: Record<
      string,
      { primaryColor: string; secondaryColor: string }
    > = {
      JavaScript: { primaryColor: "#f7df1e", secondaryColor: "#f39c12" },
      TypeScript: { primaryColor: "#3178c6", secondaryColor: "#2980b9" },
      Python: { primaryColor: "#3776ab", secondaryColor: "#2c3e50" },
      Java: { primaryColor: "#ed8b00", secondaryColor: "#e67e22" },
      React: { primaryColor: "#61dafb", secondaryColor: "#3498db" },
      Vue: { primaryColor: "#4fc08d", secondaryColor: "#27ae60" },
      Go: { primaryColor: "#00add8", secondaryColor: "#16a085" },
      Rust: { primaryColor: "#ce422b", secondaryColor: "#c0392b" },
      PHP: { primaryColor: "#777bb4", secondaryColor: "#8e44ad" },
      Ruby: { primaryColor: "#cc342d", secondaryColor: "#e74c3c" },
    };

    const topicColors = topics.find((topic) =>
      ["react", "vue", "angular", "svelte", "nextjs"].includes(
        topic.toLowerCase()
      )
    );

    if (topicColors && languageColors[topicColors]) {
      return languageColors[topicColors];
    }

    if (languageColors[language]) {
      return languageColors[language];
    }

    return { primaryColor: "#3498db", secondaryColor: "#2980b9" };
  }

  private async detectApiEndpoints(
    owner: string,
    repo: string,
    codeSnippets: CodeSnippet[]
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];

    for (const snippet of codeSnippets) {
      const content = snippet.content.toLowerCase();
      const expressRoutes = content.match(
        /(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      );
      if (expressRoutes) {
        expressRoutes.forEach((route) => {
          const match = route.match(
            /(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/
          );
          if (match) {
            endpoints.push({
              path: match[2],
              method: match[1].toUpperCase(),
              description: `${match[1].toUpperCase()} endpoint`,
              parameters: this.extractParameters(match[2]),
              responses: [
                "200 OK",
                "400 Bad Request",
                "500 Internal Server Error",
              ],
            });
          }
        });
      }

      if (
        snippet.fileName.includes("api/") &&
        (snippet.fileName.includes("route.") ||
          snippet.fileName.includes("index."))
      ) {
        const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
        methods.forEach((method) => {
          if (
            content.includes(`export async function ${method.toLowerCase()}`) ||
            content.includes(`function ${method.toLowerCase()}(`)
          ) {
            const apiPath = snippet.fileName
              .replace(/^.*\/api\//, "/api/")
              .replace(/\/(route|index)\.(js|ts|tsx)$/, "")
              .replace(/\/page\.(js|ts|tsx)$/, "");

            endpoints.push({
              path: apiPath || "/api/endpoint",
              method,
              description: `${method} API endpoint`,
              parameters: [],
              responses: ["200 OK", "400 Bad Request"],
            });
          }
        });
      }
    }
    return [
      ...new Map(
        endpoints.map((item) => [item.path + item.method, item])
      ).values(),
    ].slice(0, 10);
  }

  private extractParameters(
    path: string
  ): Array<{ name: string; type: string; required: boolean }> {
    const params: Array<{ name: string; type: string; required: boolean }> = [];
    const dynamicParams = path.match(/\[([^\]]+)\]|:([^\/]+)/g);
    if (dynamicParams) {
      dynamicParams.forEach((param) => {
        const cleanParam = param.replace(/[\[\]:]/g, "");
        params.push({
          name: cleanParam,
          type: "string",
          required: !param.includes("?"),
        });
      });
    }

    return params;
  }

  private async detectEnvVariables(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<EnvironmentVariable[]> {
    const envVars: EnvironmentVariable[] = [];
    const envFiles = structure.filter(
      (file) =>
        file.name === ".env.example" ||
        file.name === ".env.sample" ||
        file.name === ".env.template"
    );

    for (const file of envFiles) {
      const content = await this.getFileContent(owner, repo, file.path);
      if (content) {
        const lines = content.split("\n");
        lines.forEach((line) => {
          const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
          if (match) {
            envVars.push({
              key: match[1],
              description: this.getEnvDescription(match[1]),
              required: true,
              defaultValue: match[2] || undefined,
            });
          }
        });
      }
    }

    return envVars;
  }

  private getEnvDescription(key: string): string {
    const descriptions: Record<string, string> = {
      DATABASE_URL: "Database connection string",
      API_KEY: "External API key",
      SECRET_KEY: "Application secret key",
      JWT_SECRET: "JWT signing secret",
      PORT: "Application port number",
      NODE_ENV: "Node.js environment",
      REDIS_URL: "Redis connection string",
      MONGODB_URI: "MongoDB connection string",
      POSTGRES_URL: "PostgreSQL connection string",
      NEXTAUTH_SECRET: "NextAuth.js secret",
      NEXTAUTH_URL: "NextAuth.js URL",
      REPLICATE_API_TOKEN: "Replicate API token",
      GITHUB_TOKEN: "GitHub API token",
      OPENAI_API_KEY: "OpenAI API key",
    };

    return descriptions[key] || "Environment variable";
  }

  private generateBadges(
    repo: GitHubRepo & { owner: string },
    cicdConfig?: CICDConfig,
    testConfig?: TestConfig,
    deploymentConfig?: DeploymentConfig
  ): Badge[] {
    const badges: Badge[] = [];
    const repoPath = `${repo.owner}/${repo.name}`;

    if (repo.license) {
      badges.push({
        name: "License",
        url: `https://img.shields.io/github/license/${repoPath}`,
        link: `${repo.html_url}/blob/main/LICENSE`,
        category: "license",
      });
    }

    badges.push({
      name: "Stars",
      url: `https://img.shields.io/github/stars/${repoPath}?style=social`,
      link: `${repo.html_url}/stargazers`,
      category: "social",
    });

    if (cicdConfig?.platform === "github-actions") {
      badges.push({
        name: "CI",
        url: `https://img.shields.io/github/actions/workflow/status/${repoPath}/ci.yml?branch=main`,
        link: `${repo.html_url}/actions`,
        category: "build",
      });
    }

    if (deploymentConfig?.platform === "vercel") {
      badges.push({
        name: "Deploy",
        url: `https://vercel.com/button`,
        link: `https://vercel.com/new/clone?repository-url=${repo.html_url}`,
        category: "deployment",
      });
    }

    return badges;
  }

  private async generateFileTree(owner: string, repo: string): Promise<string> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        { headers: this.getHeaders() }
      );
      const ignoredDirs = [".git", "node_modules", ".next", "dist", "build"];
      return response.data.tree
        .map((node: { path: string }) => node.path)
        .filter(
          (path: string) => !ignoredDirs.some((dir) => path.startsWith(dir))
        )
        .slice(0, 100) // Limit to first 100 files for performance
        .join("\n");
    } catch (error) {
      console.warn("Could not fetch recursive file tree.", error);
      return "File tree not available.";
    }
  }

  private getFilePriority(filePath: string): number {
    const priorityPatterns: { [key: string]: number } = {
      "package.json": 10,
      "docker-compose.yml": 9,
      dockerfile: 9,
      "src/main.": 8,
      "src/index.": 8,
      "src/app.": 8,
      "src/server.": 8,
      ".env.example": 7,
      ".env.sample": 7,
      "src/lib/": 6,
      "src/utils/": 6,
      "src/core/": 6,
      "src/components/": 5,
      "src/ui/": 5,
      "src/api/": 5,
    };
    for (const pattern in priorityPatterns) {
      if (filePath.toLowerCase().includes(pattern)) {
        return priorityPatterns[pattern];
      }
    }
    return 1;
  }

  private async analyzeCode(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<CodeSnippet[]> {
    const filesToAnalyze = structure
      .filter((file) => file.type === "file")
      .sort(
        (a, b) => this.getFilePriority(b.path) - this.getFilePriority(a.path)
      )
      .slice(0, 7);

    const codeSnippets: CodeSnippet[] = [];
    for (const file of filesToAnalyze) {
      const content = await this.getFileContent(owner, repo, file.path);
      if (content) {
        codeSnippets.push({
          fileName: file.path,
          content: content,
          summary: "Awaiting AI summary",
          detectedFeatures: this.detectCodeFeatures(content),
          complexity: this.assessComplexity(content),
          mainFunction: this.extractMainFunction(content),
        });
      }
    }
    return codeSnippets;
  }

  private detectCodeFeatures(content: string): string[] {
    const features: string[] = [];
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes("react") || lowerContent.includes("jsx"))
      features.push("React");
    if (lowerContent.includes("vue")) features.push("Vue");
    if (lowerContent.includes("angular")) features.push("Angular");
    if (lowerContent.includes("express")) features.push("Express");
    if (lowerContent.includes("next")) features.push("Next.js");
    if (lowerContent.includes("mongoose") || lowerContent.includes("mongodb"))
      features.push("MongoDB");
    if (lowerContent.includes("sequelize") || lowerContent.includes("postgres"))
      features.push("PostgreSQL");
    if (lowerContent.includes("prisma")) features.push("Prisma");
    if (lowerContent.includes("auth") || lowerContent.includes("jwt"))
      features.push("Authentication");
    if (lowerContent.includes("axios") || lowerContent.includes("fetch"))
      features.push("API Integration");
    if (lowerContent.includes("graphql")) features.push("GraphQL");
    if (lowerContent.includes("jest") || lowerContent.includes("test"))
      features.push("Testing");

    return [...new Set(features)];
  }

  private assessComplexity(content: string): "low" | "medium" | "high" {
    const lines = content.split("\n").length;
    const functions = (content.match(/function|=>|\bdef\b|\bclass\b/g) || [])
      .length;
    const imports = (content.match(/import|require|from/g) || []).length;
    const complexity = lines + functions * 2 + imports;

    if (complexity < 100) return "low";
    if (complexity < 300) return "medium";
    return "high";
  }

  private extractMainFunction(content: string): string {
    const jsFunction =
      content.match(/export\s+(default\s+)?function\s+(\w+)/) ||
      content.match(/const\s+(\w+)\s*=.*?=>/);
    if (jsFunction) return jsFunction[jsFunction.length - 1];

    const pyFunction =
      content.match(/def\s+main\s*\(/) || content.match(/def\s+(\w+)\s*\(/);
    if (pyFunction) return pyFunction[1] || "main";

    return "main";
  }

  private generateContributionGuide(
    structure: FileStructure[],
    packageManagers: string[],
    scripts: Record<string, string>
  ): {
    hasCustomGuide: boolean;
    suggestedSteps: string[];
    codeOfConduct: boolean;
  } {
    const hasCustomGuide = structure.some((f) =>
      f.name.toLowerCase().startsWith("contributing")
    );
    const codeOfConduct = structure.some((f) =>
      f.name.toLowerCase().startsWith("code_of_conduct")
    );

    const suggestedSteps: string[] = [
      "Fork the repository",
      "Create a feature branch (`git checkout -b feature/amazing-feature`)",
    ];

    if (packageManagers.includes("npm"))
      suggestedSteps.push("Install dependencies (`npm install`)");
    if (scripts.dev)
      suggestedSteps.push("Start development server (`npm run dev`)");
    if (scripts.test) suggestedSteps.push("Run tests (`npm test`)");

    suggestedSteps.push(
      "Make your changes",
      "Commit your changes (`git commit -m 'Add amazing feature'`)",
      "Push to the branch (`git push origin feature/amazing-feature`)",
      "Open a Pull Request"
    );

    return { hasCustomGuide, suggestedSteps, codeOfConduct };
  }

  private async getFileStructureRecursive(
    owner: string,
    repo: string
  ): Promise<FileStructure[]> {
    try {
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        { headers: this.getHeaders() }
      );
      const ignored = [".git", "node_modules", ".next", "dist", "build"];
      return response.data.tree
        .filter(
          (node: { path: string }) =>
            !ignored.some((dir) => node.path.startsWith(dir))
        )
        .map((node: { path: string; type: "blob" | "tree"; size: number }) => ({
          name: node.path.split("/").pop() || "",
          path: node.path,
          type: node.type === "tree" ? "dir" : "file",
          size: node.size,
        }));
    } catch (error) {
      console.warn(
        "Could not fetch recursive file tree, falling back to root level.",
        error
      );
      return this.getFileStructure(owner, repo, "");
    }
  }

  async analyzeProject(owner: string, repo: string): Promise<ProjectAnalysis> {
    this.progressCallback("Starting project analysis...");
    const repository = await this.getRepository(owner, repo);
    this.progressCallback("Analyzing file structure...");
    const allFiles = await this.getFileStructureRecursive(owner, repo);

    this.progressCallback("Generating full file tree...");
    const fullFileTree = await this.generateFileTree(owner, repo);

    this.progressCallback("Analyzing key code snippets...");
    const summarizedCodeSnippets = await this.analyzeCode(
      owner,
      repo,
      allFiles
    );

    const keyFiles = allFiles
      .filter((file) => file.type === "file")
      .map((file) => file.name.toLowerCase());

    let packageJson: PackageJson | null = null;
    let dependencies: Record<string, string> = {};
    let scripts: Record<string, string> = {};
    let frameworks: string[] = [];
    // FIX 3: Use 'const' as packageManagers is never reassigned
    const packageManagers: string[] = [];
    let categorizedDependencies: CategorizedDependencies = {};

    if (keyFiles.includes("package.json")) {
      this.progressCallback("Parsing package.json...");
      const packageContent = await this.getFileContent(
        owner,
        repo,
        "package.json"
      );
      if (packageContent) {
        try {
          packageJson = JSON.parse(packageContent);
          dependencies = {
            ...(packageJson?.dependencies || {}),
            ...(packageJson?.devDependencies || {}),
          };
          scripts = packageJson?.scripts || {};
          packageManagers.push("npm");
          if (keyFiles.includes("yarn.lock")) packageManagers.push("yarn");
          if (keyFiles.includes("pnpm-lock.yaml")) packageManagers.push("pnpm");
          this.progressCallback("Categorizing dependencies...");
          categorizedDependencies = this.categorizeDependencies(dependencies);
          frameworks = categorizedDependencies["UI Framework"] || [];
          // FIX 4: Remove unused 'e' variable in catch block
        } catch {
          this.progressCallback("Warning: Failed to parse package.json.");
        }
      }
    }

    this.progressCallback(
      "Detecting CI/CD, testing, and deployment configs..."
    );
    const [
      cicdConfig,
      testConfig,
      deploymentConfig,
      envVariables,
      apiEndpoints,
    ] = await Promise.all([
      this.detectCICD(owner, repo, allFiles),
      this.detectTestConfig(owner, repo, allFiles, packageJson),
      this.detectDeploymentConfig(owner, repo, allFiles, packageJson),
      this.detectEnvVariables(owner, repo, allFiles),
      this.detectApiEndpoints(owner, repo, summarizedCodeSnippets),
    ]);

    this.progressCallback("Analyzing contribution guidelines...");
    const contributionGuide = this.generateContributionGuide(
      allFiles,
      packageManagers,
      scripts
    );

    this.progressCallback("Generating badges...");
    const badges = this.generateBadges(
      { ...repository, owner },
      cicdConfig,
      testConfig,
      deploymentConfig
    );

    this.progressCallback("✓ Analysis complete.");

    return {
      repository,
      mainLanguage: repository.language,
      frameworks,
      packageManagers: [...new Set(packageManagers)],
      dependencies,
      categorizedDependencies,
      scripts,
      hasDocumentation: keyFiles.includes("readme.md"),
      structure: allFiles,
      keyFiles,
      fullFileTree,
      summarizedCodeSnippets,
      apiEndpoints,
      envVariables,
      badges,
      cicdConfig,
      testConfig,
      deploymentConfig,
      projectLogo: this.generateProjectLogo(repository),
      contributionGuide,
    };
  }
}
