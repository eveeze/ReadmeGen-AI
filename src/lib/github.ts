import axios from "axios";
import {
  GitHubRepo,
  FileStructure,
  ProjectAnalysis,
  CodeSnippet,
  ApiEndpoint,
  EnvironmentVariable,
  Badge,
  CICDConfig,
  TestConfig,
  DeploymentConfig,
  ProjectLogo,
} from "@/types";

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubAnalyzer {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  private getHeaders() {
    return this.token
      ? {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReadmeGen-AI/1.0.0",
        }
      : {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReadmeGen-AI/1.0.0",
        };
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    try {
      console.log(`Fetching repository: ${owner}/${repo}`);
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );
      console.log(`Successfully fetched repository data for ${owner}/${repo}`);
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
    } catch (error) {
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
    } catch (error) {
      return null;
    }
  }

  // NEW: Detect CI/CD configuration
  private async detectCICD(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<CICDConfig | undefined> {
    const cicdFiles = structure.filter((file) => {
      const path = file.path.toLowerCase();
      return (
        path.includes(".github/workflows") ||
        path.includes(".travis.yml") ||
        path.includes(".circleci") ||
        path.includes("jenkinsfile") ||
        path.includes(".gitlab-ci.yml")
      );
    });

    if (cicdFiles.length === 0) return undefined;

    // Check for GitHub Actions
    const githubActionsFiles = cicdFiles.filter((file) =>
      file.path.includes(".github/workflows")
    );

    if (githubActionsFiles.length > 0) {
      const workflows: string[] = [];
      let hasTesting = false;
      let hasDeployment = false;

      for (const file of githubActionsFiles.slice(0, 3)) {
        // Analyze first 3 workflow files
        const content = await this.getFileContent(owner, repo, file.path);
        if (content) {
          const workflowName = file.name
            .replace(".yml", "")
            .replace(".yaml", "");
          workflows.push(workflowName);

          if (
            content.includes("test") ||
            content.includes("jest") ||
            content.includes("pytest")
          ) {
            hasTesting = true;
          }
          if (
            content.includes("deploy") ||
            content.includes("vercel") ||
            content.includes("netlify")
          ) {
            hasDeployment = true;
          }
        }
      }

      return {
        platform: "github-actions",
        configFile: ".github/workflows",
        workflows,
        hasTesting,
        hasDeployment,
      };
    }

    // Check for other CI/CD platforms
    if (structure.some((f) => f.name === ".travis.yml")) {
      return {
        platform: "travis",
        configFile: ".travis.yml",
        workflows: ["Travis CI"],
        hasTesting: true,
        hasDeployment: false,
      };
    }

    return undefined;
  }

  // NEW: Detect test configuration
  private async detectTestConfig(
    owner: string,
    repo: string,
    structure: FileStructure[],
    packageJson?: any
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
    let commands: string[] = [];
    let coverage = false;
    let e2eTests = false;
    let unitTests = false;

    // Detect from package.json scripts
    if (packageJson?.scripts) {
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

      // Detect framework from dependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      if (allDeps.jest) framework = "Jest";
      else if (allDeps.mocha) framework = "Mocha";
      else if (allDeps.cypress) framework = "Cypress";
      else if (allDeps.playwright) framework = "Playwright";
      else if (allDeps.vitest) framework = "Vitest";
    }

    // Detect from file extensions
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

    return {
      framework,
      testFiles: testFiles.slice(0, 10).map((f) => f.path),
      commands: commands.length > 0 ? commands : ["npm test"],
      coverage,
      e2eTests,
      unitTests,
    };
  }

  // NEW: Detect deployment configuration
  private detectDeploymentConfig(
    structure: FileStructure[],
    packageJson?: any
  ): DeploymentConfig | undefined {
    const deploymentFiles = structure.filter((file) => {
      const name = file.name.toLowerCase();
      return (
        name === "vercel.json" ||
        name === "netlify.toml" ||
        name === "_redirects" ||
        name === "procfile" ||
        name === "dockerfile" ||
        name === "docker-compose.yml" ||
        name === "app.yaml" ||
        name === "serverless.yml"
      );
    });

    if (deploymentFiles.length === 0) return undefined;

    let platform: DeploymentConfig["platform"] = "vercel"; // default
    let requiresEnv = false;
    let buildCommand = "";

    // Detect platform
    if (deploymentFiles.some((f) => f.name === "vercel.json")) {
      platform = "vercel";
    } else if (
      deploymentFiles.some(
        (f) => f.name === "netlify.toml" || f.name === "_redirects"
      )
    ) {
      platform = "netlify";
    } else if (
      deploymentFiles.some((f) => f.name.toLowerCase() === "procfile")
    ) {
      platform = "heroku";
    } else if (deploymentFiles.some((f) => f.name === "dockerfile")) {
      platform = "docker";
    }

    // Check for build command
    if (packageJson?.scripts?.build) {
      buildCommand = "npm run build";
    }

    // Check if requires environment variables
    if (
      structure.some(
        (f) => f.name === ".env.example" || f.name === ".env.sample"
      )
    ) {
      requiresEnv = true;
    }

    return {
      platform,
      configFiles: deploymentFiles.map((f) => f.name),
      requiresEnv,
      buildCommand,
    };
  }

  // NEW: Generate project logo
  private generateProjectLogo(repository: GitHubRepo): ProjectLogo {
    const name = repository.name.toLowerCase();
    const firstLetter = name.charAt(0).toUpperCase();
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

  // NEW: Get color scheme based on language and topics
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

    // Check topics for frameworks
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

    return { primaryColor: "#3498db", secondaryColor: "#2980b9" }; // Default blue
  }

  // NEW: Enhanced API endpoint detection
  private async detectApiEndpoints(
    owner: string,
    repo: string,
    codeSnippets: CodeSnippet[]
  ): Promise<ApiEndpoint[]> {
    const endpoints: ApiEndpoint[] = [];

    for (const snippet of codeSnippets) {
      const content = snippet.content.toLowerCase();

      // Express.js patterns
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

      // Next.js API routes
      if (
        snippet.fileName.includes("api/") &&
        snippet.fileName.includes("route.")
      ) {
        const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
        methods.forEach((method) => {
          if (
            content.includes(`export async function ${method.toLowerCase()}`)
          ) {
            const apiPath = snippet.fileName
              .replace(/^.*\/api\//, "/api/")
              .replace(/\/route\.(js|ts)$/, "")
              .replace(/\/page\.(js|ts)$/, "");

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

      // FastAPI patterns (Python)
      const fastapiRoutes = content.match(
        /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      );
      if (fastapiRoutes) {
        fastapiRoutes.forEach((route) => {
          const match = route.match(
            /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/
          );
          if (match) {
            endpoints.push({
              path: match[2],
              method: match[1].toUpperCase(),
              description: `FastAPI ${match[1].toUpperCase()} endpoint`,
              parameters: this.extractParameters(match[2]),
              responses: ["200 OK", "422 Validation Error"],
            });
          }
        });
      }
    }

    return endpoints.slice(0, 10); // Limit to 10 endpoints
  }

  // NEW: Extract parameters from URL path
  private extractParameters(
    path: string
  ): Array<{ name: string; type: string; required: boolean }> {
    const params: Array<{ name: string; type: string; required: boolean }> = [];

    // Express/Next.js dynamic routes
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

  // NEW: Enhanced environment variable detection
  private async detectEnvVariables(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<EnvironmentVariable[]> {
    const envVars: EnvironmentVariable[] = [];

    // Check .env.example or .env.sample files
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

  // NEW: Get environment variable description
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

  // Enhanced badge generation
  private generateBadges(
    repo: GitHubRepo & { owner: string },
    cicdConfig?: CICDConfig,
    testConfig?: TestConfig,
    deploymentConfig?: DeploymentConfig
  ): Badge[] {
    const badges: Badge[] = [];
    const repoPath = `${repo.owner}/${repo.name}`;

    // Existing badges
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

    badges.push({
      name: "Forks",
      url: `https://img.shields.io/github/forks/${repoPath}?style=social`,
      link: `${repo.html_url}/network/members`,
      category: "social",
    });

    // NEW: CI/CD badges
    if (cicdConfig?.platform === "github-actions") {
      badges.push({
        name: "CI",
        url: `https://img.shields.io/github/actions/workflow/status/${repoPath}/ci.yml?branch=main`,
        link: `${repo.html_url}/actions`,
        category: "build",
      });
    }

    // NEW: Test coverage badge (if tests detected)
    if (testConfig?.coverage) {
      badges.push({
        name: "Coverage",
        url: `https://img.shields.io/codecov/c/github/${repoPath}`,
        link: `https://codecov.io/gh/${repoPath}`,
        category: "coverage",
      });
    }

    // NEW: Deployment badges
    if (deploymentConfig?.platform === "vercel") {
      badges.push({
        name: "Deploy",
        url: `https://img.shields.io/badge/deploy-vercel-black?logo=vercel`,
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
        .join("\n");
    } catch (error) {
      console.warn("Could not fetch recursive file tree.", error);
      return "File tree not available.";
    }
  }

  private getFilePriority(filePath: string): number {
    const priorityPatterns: { [key: string]: number } = {
      "package.json": 10,
      "requirements.txt": 10,
      "pom.xml": 10,
      "build.gradle": 10,
      "composer.json": 10,
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
          detectedFeatures: this.detectCodeFeatures(content, file.path),
          complexity: this.assessComplexity(content),
          mainFunction: this.extractMainFunction(content),
        });
      }
    }
    return codeSnippets;
  }

  // NEW: Detect code features
  private detectCodeFeatures(content: string, fileName: string): string[] {
    const features: string[] = [];
    const lowerContent = content.toLowerCase();

    // Framework detection
    if (lowerContent.includes("react") || lowerContent.includes("jsx"))
      features.push("React");
    if (lowerContent.includes("vue")) features.push("Vue");
    if (lowerContent.includes("angular")) features.push("Angular");
    if (lowerContent.includes("express")) features.push("Express");
    if (lowerContent.includes("next")) features.push("Next.js");

    // Database
    if (lowerContent.includes("mongoose") || lowerContent.includes("mongodb"))
      features.push("MongoDB");
    if (lowerContent.includes("sequelize") || lowerContent.includes("postgres"))
      features.push("PostgreSQL");
    if (lowerContent.includes("prisma")) features.push("Prisma");

    // Authentication
    if (lowerContent.includes("auth") || lowerContent.includes("jwt"))
      features.push("Authentication");
    if (lowerContent.includes("passport")) features.push("Passport.js");

    // API
    if (lowerContent.includes("axios") || lowerContent.includes("fetch"))
      features.push("API Integration");
    if (lowerContent.includes("graphql")) features.push("GraphQL");

    // Testing
    if (lowerContent.includes("jest") || lowerContent.includes("test"))
      features.push("Testing");
    if (lowerContent.includes("cypress") || lowerContent.includes("playwright"))
      features.push("E2E Testing");

    return features;
  }

  // NEW: Assess code complexity
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

  // NEW: Extract main function
  private extractMainFunction(content: string): string {
    // JavaScript/TypeScript patterns
    const jsFunction =
      content.match(/export\s+(default\s+)?function\s+(\w+)/) ||
      content.match(/const\s+(\w+)\s*=.*?=>/);
    if (jsFunction) return jsFunction[jsFunction.length - 1];

    // Python patterns
    const pyFunction =
      content.match(/def\s+main\s*\(/) || content.match(/def\s+(\w+)\s*\(/);
    if (pyFunction) return pyFunction[1] || "main";

    // Java patterns
    const javaFunction =
      content.match(/public\s+static\s+void\s+main/) ||
      content.match(/public\s+class\s+(\w+)/);
    if (javaFunction) return javaFunction[1] || "main";

    return "main";
  }

  // NEW: Generate contribution guide
  private generateContributionGuide(
    structure: FileStructure[],
    packageManagers: string[],
    scripts: Record<string, string>
  ): {
    hasCustomGuide: boolean;
    suggestedSteps: string[];
    codeOfConduct: boolean;
  } {
    const hasCustomGuide = structure.some(
      (f) =>
        f.name.toLowerCase() === "contributing.md" ||
        f.name.toLowerCase() === "contribution.md"
    );

    const codeOfConduct = structure.some(
      (f) =>
        f.name.toLowerCase() === "code_of_conduct.md" ||
        f.name.toLowerCase() === "code-of-conduct.md"
    );

    const suggestedSteps: string[] = [
      "Fork the repository",
      "Create a feature branch (`git checkout -b feature/amazing-feature`)",
    ];

    // Add setup steps based on package manager
    if (packageManagers.includes("npm")) {
      suggestedSteps.push("Install dependencies (`npm install`)");
    } else if (packageManagers.includes("yarn")) {
      suggestedSteps.push("Install dependencies (`yarn install`)");
    } else if (packageManagers.includes("pip")) {
      suggestedSteps.push(
        "Create virtual environment and install dependencies"
      );
    }

    // Add development steps based on available scripts
    if (scripts.dev) {
      suggestedSteps.push("Start development server (`npm run dev`)");
    }
    if (scripts.test) {
      suggestedSteps.push("Run tests (`npm test`)");
    }
    if (scripts.lint) {
      suggestedSteps.push("Run linting (`npm run lint`)");
    }

    suggestedSteps.push(
      "Make your changes",
      "Commit your changes (`git commit -m 'Add amazing feature'`)",
      "Push to the branch (`git push origin feature/amazing-feature`)",
      "Open a Pull Request"
    );

    return {
      hasCustomGuide,
      suggestedSteps,
      codeOfConduct,
    };
  }

  async analyzeProject(owner: string, repo: string): Promise<ProjectAnalysis> {
    const repository = await this.getRepository(owner, repo);
    const structure = await this.getFileStructure(owner, repo);

    const [fullFileTree, summarizedCodeSnippets] = await Promise.all([
      this.generateFileTree(owner, repo),
      this.analyzeCode(owner, repo, structure),
    ]);

    const keyFiles = structure
      .filter((file) => file.type === "file")
      .map((file) => file.name.toLowerCase())
      .filter((name) =>
        [
          "package.json",
          "requirements.txt",
          "composer.json",
          "dockerfile",
          "docker-compose.yml",
          "readme.md",
        ].includes(name)
      );

    const frameworks: string[] = [];
    const packageManagers: string[] = [];
    let dependencies: Record<string, string> = {};
    let scripts: Record<string, string> = {};
    let packageJson: any = null;

    if (keyFiles.includes("package.json")) {
      packageManagers.push("npm");
      const packageContent = await this.getFileContent(
        owner,
        repo,
        "package.json"
      );
      if (packageContent) {
        try {
          packageJson = JSON.parse(packageContent);
          dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
          scripts = packageJson.scripts || {};
          if (dependencies["next"]) frameworks.push("Next.js");
          if (dependencies["react"]) frameworks.push("React");
          if (dependencies["vue"]) frameworks.push("Vue");
          if (dependencies["@angular/core"]) frameworks.push("Angular");
          if (dependencies["express"]) frameworks.push("Express");
        } catch (e) {
          console.warn("Failed to parse package.json");
        }
      }
    }

    // NEW: Detect all new features
    const [
      cicdConfig,
      testConfig,
      deploymentConfig,
      envVariables,
      apiEndpoints,
      projectLogo,
    ] = await Promise.all([
      this.detectCICD(owner, repo, structure),
      this.detectTestConfig(owner, repo, structure, packageJson),
      Promise.resolve(this.detectDeploymentConfig(structure, packageJson)),
      this.detectEnvVariables(owner, repo, structure),
      this.detectApiEndpoints(owner, repo, summarizedCodeSnippets),
      Promise.resolve(this.generateProjectLogo(repository)),
    ]);

    const contributionGuide = this.generateContributionGuide(
      structure,
      packageManagers,
      scripts
    );

    const badges = this.generateBadges(
      { ...repository, owner },
      cicdConfig,
      testConfig,
      deploymentConfig
    );

    return {
      repository,
      mainLanguage: repository.language,
      frameworks,
      packageManagers,
      dependencies,
      scripts,
      hasDocumentation: keyFiles.includes("readme.md"),
      structure,
      keyFiles,
      fullFileTree,
      summarizedCodeSnippets,
      apiEndpoints,
      envVariables,
      badges,
      // NEW features
      cicdConfig,
      testConfig,
      deploymentConfig,
      projectLogo,
      contributionGuide,
    };
  }
}
