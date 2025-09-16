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
  ProjectType,
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
          "User-Agent": "ReadmeGen-AI/2.1.0-deep-analysis",
        }
      : {
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "ReadmeGen-AI/2.1.0-deep-analysis",
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
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/`,
        { headers: this.getHeaders() }
      );
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
    }
  }

  private async analyzeGoProject(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ) {
    this.progressCallback("Running Go-specific analysis...");
    const dependencies: Record<string, string> = {};
    let databaseTech = "Unknown"; // Variabel untuk menyimpan teknologi database

    // 1. Prioritas utama: go.mod
    const goModContent = await this.getFileContent(owner, repo, "go.mod");
    if (goModContent) {
      const requireRegex =
        /require\s*\(([\s\S]*?)\)|require\s+([\w\.\/]+)\s+v[\d\.]+/g;
      let match;
      while ((match = requireRegex.exec(goModContent)) !== null) {
        const block = match[1] || match[0];
        const dependencyRegex = /([\w\.\/]+)\s+v[\d\.]+/g;
        let depMatch;
        while ((depMatch = dependencyRegex.exec(block)) !== null) {
          const depName = depMatch[1].trim();
          dependencies[depName] = "latest";
          // Deteksi database dari dependensi
          if (depName.includes("go-sqlite3")) {
            databaseTech = "SQLite";
          } else if (depName.includes("pq") || depName.includes("pgx")) {
            databaseTech = "PostgreSQL";
          }
        }
      }
    }

    // 2. Prioritas kedua: Konfirmasi dari kode sumber
    const dbFileContent = await this.getFileContent(owner, repo, "database.go");
    if (dbFileContent && dbFileContent.includes(`sql.Open("sqlite3"`)) {
      // Jika kode secara eksplisit membuka koneksi sqlite3, ini adalah konfirmasi kuat.
      databaseTech = "SQLite";
    }

    const isDiscordBot = Object.keys(dependencies).some((dep) =>
      dep.includes("discordgo")
    );
    const projectType: ProjectType = isDiscordBot ? "Discord Bot" : "Backend";

    // Tambahkan databaseTech ke dalam frameworks untuk diteruskan ke AI
    const frameworks = databaseTech !== "Unknown" ? [databaseTech] : [];

    return { dependencies, scripts: {}, frameworks, projectType };
  }

  private async analyzeJavaScriptProject(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ) {
    this.progressCallback("Running JavaScript/TypeScript analysis...");
    const packageContent = await this.getFileContent(
      owner,
      repo,
      "package.json"
    );
    if (!packageContent)
      return {
        dependencies: {},
        scripts: {},
        frameworks: [],
        projectType: "Web App" as ProjectType,
      };

    try {
      const packageJson = JSON.parse(packageContent) as PackageJson;
      const dependencies = {
        ...(packageJson?.dependencies || {}),
        ...(packageJson?.devDependencies || {}),
      };
      const scripts = packageJson?.scripts || {};
      const categorized = this.categorizeDependencies(dependencies);
      const frameworks = categorized["UI Framework"] || [];

      let projectType: ProjectType = "Web App";
      if (dependencies["discord.js"] || dependencies["discord-api-types"]) {
        projectType = "Discord Bot";
      } else if (
        frameworks.length === 0 &&
        (dependencies["express"] || dependencies["fastify"])
      ) {
        projectType = "Backend";
      } else if (
        !frameworks.some((f) =>
          ["next", "react", "vue", "angular", "svelte"].includes(f)
        )
      ) {
        projectType = "Library/Tool";
      }

      return { dependencies, scripts, frameworks, projectType };
    } catch (e) {
      this.progressCallback("Warning: Could not parse package.json.");
      return {
        dependencies: {},
        scripts: {},
        frameworks: [],
        projectType: "Web App" as ProjectType,
      };
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
        const content = await this.getFileContent(owner, repo, file.path);
        if (content) {
          try {
            const workflowConfig = yaml.load(content) as GitHubWorkflow;
            workflows.push(
              workflowConfig.name || file.name.replace(/\.ya?ml$/, "")
            );

            if (workflowConfig.jobs) {
              for (const jobName in workflowConfig.jobs) {
                const job = workflowConfig.jobs[jobName];
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

  private async getFilePriority(
    filePath: string,
    language: string
  ): Promise<number> {
    const genericPrio: { [key: string]: number } = {
      readme: 11,
      "docker-compose": 10,
      dockerfile: 9,
      ".env": 8,
    };

    const langPrio: { [lang: string]: { [key: string]: number } } = {
      go: { "go.mod": 12, "main.go": 9, "cmd/": 8, "internal/": 7, "pkg/": 7 },
      javascript: {
        "package.json": 12,
        "src/index": 9,
        "src/main": 9,
        "src/app": 8,
        "server.js": 8,
        "api/": 7,
      },
      typescript: {
        "package.json": 12,
        "src/index": 9,
        "src/main": 9,
        "src/app": 8,
        "server.ts": 8,
        "api/": 7,
      },
      python: { "requirements.txt": 12, "main.py": 9, "app.py": 9 },
    };

    const lowerPath = filePath.toLowerCase();
    for (const pattern in genericPrio) {
      if (lowerPath.includes(pattern)) return genericPrio[pattern];
    }

    const specificLangPrio = langPrio[language.toLowerCase()];
    if (specificLangPrio) {
      for (const pattern in specificLangPrio) {
        if (lowerPath.includes(pattern)) return specificLangPrio[pattern];
      }
    }

    return 1;
  }

  private async analyzeCode(
    owner: string,
    repo: string,
    structure: FileStructure[],
    language: string
  ): Promise<CodeSnippet[]> {
    const filesWithPriority = await Promise.all(
      structure
        .filter((f) => f.type === "file")
        .map(async (f) => ({
          file: f,
          priority: await this.getFilePriority(f.path, language),
        }))
    );

    const filesToAnalyze = filesWithPriority
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10)
      .map((item) => item.file);

    const codeSnippets: CodeSnippet[] = [];
    for (const file of filesToAnalyze) {
      const content = await this.getFileContent(owner, repo, file.path);
      if (content) {
        codeSnippets.push({
          fileName: file.path,
          content: content,
          summary: "Awaiting AI summary",
        });
      }
    }
    return codeSnippets;
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
    structure: FileStructure[],
    codeSnippets: CodeSnippet[]
  ): Promise<EnvironmentVariable[]> {
    const envVars: EnvironmentVariable[] = [];
    const envFile = structure.find(
      (file) =>
        file.name === ".env.example" ||
        file.name === ".env.sample" ||
        file.name === ".env.template"
    );

    if (envFile) {
      const content = await this.getFileContent(owner, repo, envFile.path);
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

    // Analisis dari kode sumber untuk variabel yang tidak ada di .env.example
    for (const snippet of codeSnippets) {
      // Contoh untuk Go (bisa diperluas untuk bahasa lain)
      if (snippet.fileName.endsWith(".go")) {
        const matches = snippet.content.matchAll(/os\.Getenv\("([^"]+)"\)/g);
        for (const match of matches) {
          const key = match[1];
          if (!envVars.some((v) => v.key === key)) {
            envVars.push({
              key: key,
              description: this.getEnvDescription(key),
              required: true, // Asumsikan wajib jika dipanggil di kode
              defaultValue: undefined,
            });
          }
        }
      }
    }

    // Hapus duplikat
    return [...new Map(envVars.map((item) => [item.key, item])).values()];
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

  async analyzeProject(owner: string, repo: string): Promise<ProjectAnalysis> {
    this.progressCallback(
      "Stage 1: Initializing and fetching repository data..."
    );
    const repository = await this.getRepository(owner, repo);
    const mainLanguage = repository.language.toLowerCase();

    this.progressCallback(
      `✓ Main language detected: ${repository.language}. Tailoring analysis...`
    );
    const allFiles = await this.getFileStructureRecursive(owner, repo);

    let langSpecifics;
    const packageManagers: string[] = [];

    if (allFiles.some((f) => f.name.toLowerCase() === "package.json")) {
      packageManagers.push("npm");
      if (allFiles.some((f) => f.name.toLowerCase() === "yarn.lock"))
        packageManagers.push("yarn");
      if (allFiles.some((f) => f.name.toLowerCase() === "pnpm-lock.yaml"))
        packageManagers.push("pnpm");
    }

    // Sesuaikan pemanggilan fungsi berdasarkan bahasa
    switch (mainLanguage) {
      case "go":
        langSpecifics = await this.analyzeGoProject(owner, repo, allFiles);
        break;
      case "javascript":
      case "typescript":
        // Anda bisa tetap menggunakan analyzeJavaScriptProject atau membuatnya lebih canggih
        langSpecifics = await this.analyzeJavaScriptProject(
          owner,
          repo,
          allFiles
        );
        break;
      default:
        this.progressCallback(
          `Using generic analysis for ${repository.language}.`
        );
        langSpecifics = {
          dependencies: {},
          scripts: {},
          frameworks: [],
          projectType: "Unknown" as ProjectType,
        };
    }

    this.progressCallback(
      "Stage 2: Analyzing code structure and core logic..."
    );
    const summarizedCodeSnippets = await this.analyzeCode(
      owner,
      repo,
      allFiles,
      mainLanguage
    );

    this.progressCallback(
      "Stage 3: Detecting configurations (CI/CD, Deployment, Tests)..."
    );

    let packageJson: PackageJson | null = null;
    if (packageManagers.includes("npm")) {
      const content = await this.getFileContent(owner, repo, "package.json");
      if (content) {
        try {
          packageJson = JSON.parse(content);
        } catch (e) {
          console.warn("Could not parse package.json for config detection");
        }
      }
    }

    // Panggil Promise.all dengan fungsi yang sudah diperbarui
    const [
      cicdConfig,
      testConfig,
      deploymentConfig,
      envVariables, // envVariables sekarang dihitung dengan logika baru
      apiEndpoints,
    ] = await Promise.all([
      this.detectCICD(owner, repo, allFiles),
      this.detectTestConfig(owner, repo, allFiles, packageJson),
      this.detectDeploymentConfig(owner, repo, allFiles, packageJson),
      this.detectEnvVariables(owner, repo, allFiles, summarizedCodeSnippets), // Logika baru
      this.detectApiEndpoints(owner, repo, summarizedCodeSnippets),
    ]);

    const contributionGuide = this.generateContributionGuide(
      allFiles,
      packageManagers,
      langSpecifics.scripts
    );

    const fullFileTree = allFiles
      .map((f) => f.path)
      .slice(0, 100)
      .join("\n");

    this.progressCallback("✓ Analysis complete. Compiling final report.");

    return {
      repository,
      mainLanguage: repository.language,
      projectType: langSpecifics.projectType,
      frameworks: langSpecifics.frameworks,
      packageManagers,
      dependencies: langSpecifics.dependencies,
      categorizedDependencies: this.categorizeDependencies(
        langSpecifics.dependencies
      ),
      scripts: langSpecifics.scripts,
      hasDocumentation: allFiles.some((f) =>
        f.name.toLowerCase().includes("readme")
      ),
      structure: allFiles,
      keyFiles: allFiles.map((f) => f.name.toLowerCase()),
      fullFileTree,
      summarizedCodeSnippets,
      apiEndpoints,
      envVariables,
      badges: [],
      cicdConfig,
      testConfig,
      deploymentConfig,
      projectLogo: this.generateProjectLogo(repository),
      contributionGuide,
    };
  }
}
