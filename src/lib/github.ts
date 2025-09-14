import axios from "axios";
import {
  GitHubRepo,
  FileStructure,
  ProjectAnalysis,
  CodeSnippet,
  ApiEndpoint,
  EnvironmentVariable,
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
            if (message.includes("API rate limit exceeded")) {
              throw new Error(
                "GitHub API rate limit exceeded. Please add a GitHub token to increase limits."
              );
            }
            throw new Error(`GitHub API access forbidden: ${message}`);
          case 401:
            throw new Error("GitHub token is invalid or expired");
          case 422:
            throw new Error(`Invalid repository format: ${owner}/${repo}`);
          case 500:
          case 502:
          case 503:
          case 504:
            throw new Error(
              "GitHub API is temporarily unavailable. Please try again later."
            );
          default:
            throw new Error(`GitHub API error (${status}): ${message}`);
        }
      }

      if (typeof error === "object" && error !== null && "code" in error) {
        const code = (error as { code?: string }).code;
        if (code === "ECONNABORTED") {
          throw new Error(
            "Request timeout. GitHub API is taking too long to respond."
          );
        }
        if (code === "ENOTFOUND" || code === "ECONNREFUSED") {
          throw new Error(
            "Network error. Please check your internet connection."
          );
        }
      }

      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? (error as { message?: string }).message
            ? String((error as { message: string }).message)
            : "Unknown error"
          : String(error);
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
      console.log(
        `Fetching file structure for: ${owner}/${repo}${path ? `/${path}` : ""}`
      );

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      if (!Array.isArray(response.data)) {
        console.warn(
          `Expected array but got ${typeof response.data} for path: ${path}`
        );
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
          type: item.type === "dir" ? "dir" : "file",
          size: item.size,
        })
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.warn(
          `Failed to get file structure for path: ${path} (Status: ${status})`
        );
      } else {
        console.warn(`Failed to get file structure for path: ${path}`, error);
      }
      return [];
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string | null> {
    try {
      console.log(`Fetching file content: ${owner}/${repo}/${path}`);

      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: this.getHeaders(),
          timeout: 10000,
        }
      );

      if (response.data.content) {
        const content = Buffer.from(response.data.content, "base64").toString(
          "utf-8"
        );
        console.log(
          `Successfully fetched content for: ${path} (${content.length} characters)`
        );
        return content;
      }

      console.warn(`No content found for file: ${path}`);
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        console.warn(
          `Failed to get content for file: ${path} (Status: ${status})`
        );
      } else {
        console.warn(`Failed to get content for file: ${path}`, error);
      }
      return null;
    }
  }

  private async generateFileTree(owner: string, repo: string): Promise<string> {
    try {
      console.log(`Generating file tree for: ${owner}/${repo}`);
      const response = await axios.get(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/main?recursive=1`,
        {
          headers: this.getHeaders(),
        }
      );

      const ignoredDirs = [".git", "node_modules", ".next", "dist", "build"];
      const tree = response.data.tree
        .map((node: { path: string }) => node.path)
        .filter(
          (path: string) => !ignoredDirs.some((dir) => path.startsWith(dir))
        )
        .join("\n");
      return tree;
    } catch (error) {
      console.warn("Could not fetch recursive file tree.", error);
      return "File tree not available.";
    }
  }

  private async analyzeEnvFile(
    owner: string,
    repo: string
  ): Promise<EnvironmentVariable[]> {
    const content = await this.getFileContent(owner, repo, ".env.example");
    if (!content) return [];

    return content
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("#"))
      .map((line) => ({ key: line.split("=")[0] }));
  }

  private analyzeApiRoutes(structure: FileStructure[]): ApiEndpoint[] {
    const apiFiles = structure.filter(
      (file) =>
        file.type === "file" &&
        (file.path.startsWith("src/app/api/") ||
          file.path.startsWith("src/pages/api/"))
    );

    return apiFiles.map((file) => {
      const parts = file.path.split("/");
      // A simple heuristic to determine method from filename, e.g. `route.ts` -> GET, POST etc.
      // or from folder structure for more complex routing.
      const method = "GET/POST"; // Placeholder
      return {
        path: `/api/${parts.slice(3, -1).join("/")}`,
        method,
        description: "", // To be filled by AI
      };
    });
  }

  private async analyzeCode(
    owner: string,
    repo: string,
    structure: FileStructure[]
  ): Promise<CodeSnippet[]> {
    const codeSnippets: CodeSnippet[] = [];
    const priorityFiles = [
      "src/app/page.tsx",
      "src/components/Header.tsx",
      "next.config.ts",
      "src/lib/ai.ts",
      "src/lib/github.ts",
      "package.json",
    ];

    const filesToAnalyze = structure
      .filter(
        (file) => file.type === "file" && priorityFiles.includes(file.path)
      )
      .slice(0, 7); // Limit to 5-7 files

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

  async analyzeProject(owner: string, repo: string): Promise<ProjectAnalysis> {
    console.log(`Starting project analysis for: ${owner}/${repo}`);

    const repository = await this.getRepository(owner, repo);
    console.log(`Repository fetched successfully: ${repository.name}`);

    const structure = await this.getFileStructure(owner, repo);
    console.log(`File structure fetched: ${structure.length} items`);

    const [fullFileTree, envVariables, apiEndpoints, summarizedCodeSnippets] =
      await Promise.all([
        this.generateFileTree(owner, repo),
        this.analyzeEnvFile(owner, repo),
        this.analyzeApiRoutes(structure),
        this.analyzeCode(owner, repo, structure),
      ]);
    console.log(`Full file tree generated.`);
    console.log(`Found ${envVariables.length} environment variables.`);
    console.log(`Found ${apiEndpoints.length} API endpoints.`);
    console.log(`Summarized ${summarizedCodeSnippets.length} code snippets.`);

    const keyFiles = structure
      .filter((file) => file.type === "file")
      .map((file) => file.name.toLowerCase())
      .filter((name) =>
        [
          "package.json",
          "requirements.txt",
          "composer.json",
          "cargo.toml",
          "pom.xml",
          "build.gradle",
          "gemfile",
          "go.mod",
          "setup.py",
          "dockerfile",
          "docker-compose.yml",
          "makefile",
          "readme.md",
          "license",
          "contributing.md",
          ".gitignore",
        ].includes(name)
      );

    console.log(`Key files found: ${keyFiles.join(", ")}`);

    const frameworks: string[] = [];
    const packageManagers: string[] = [];
    let dependencies: Record<string, string> = {};
    let scripts: Record<string, string> = {};

    if (keyFiles.includes("package.json")) {
      packageManagers.push("npm");
      console.log("Analyzing package.json...");

      const packageContent = await this.getFileContent(
        owner,
        repo,
        "package.json"
      );
      if (packageContent) {
        try {
          const packageJson = JSON.parse(packageContent);
          dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
          };
          scripts = packageJson.scripts || {};

          if (dependencies["next"]) frameworks.push("Next.js");
          if (dependencies["react"]) frameworks.push("React");
          if (dependencies["vue"]) frameworks.push("Vue.js");
          if (dependencies["angular"]) frameworks.push("Angular");
          if (dependencies["express"]) frameworks.push("Express.js");
          if (dependencies["fastify"]) frameworks.push("Fastify");

          console.log(`Detected frameworks: ${frameworks.join(", ")}`);
        } catch (e) {
          console.warn("Failed to parse package.json:", e);
        }
      }
    }

    if (keyFiles.includes("requirements.txt")) {
      packageManagers.push("pip");
      console.log("Analyzing requirements.txt...");

      const reqContent = await this.getFileContent(
        owner,
        repo,
        "requirements.txt"
      );
      if (reqContent) {
        const deps = reqContent
          .split("\n")
          .filter((line) => line.trim() && !line.startsWith("#"))
          .reduce((acc, line) => {
            const [pkg] = line.split("==");
            acc[pkg.trim()] = line.includes("==")
              ? line.split("==")[1]
              : "latest";
            return acc;
          }, {} as Record<string, string>);
        dependencies = { ...dependencies, ...deps };

        if (deps["django"]) frameworks.push("Django");
        if (deps["flask"]) frameworks.push("Flask");
        if (deps["fastapi"]) frameworks.push("FastAPI");
        if (deps["streamlit"]) frameworks.push("Streamlit");

        console.log(
          `Detected Python frameworks: ${frameworks
            .filter((f) =>
              ["Django", "Flask", "FastAPI", "Streamlit"].includes(f)
            )
            .join(", ")}`
        );
      }
    }

    if (keyFiles.includes("cargo.toml")) {
      packageManagers.push("cargo");
      frameworks.push("Rust");
    }

    if (keyFiles.includes("go.mod")) {
      packageManagers.push("go mod");
      frameworks.push("Go");
    }

    const analysis: ProjectAnalysis = {
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
    };

    console.log(`Project analysis completed for: ${owner}/${repo}`);
    console.log(`- Language: ${analysis.mainLanguage}`);
    console.log(`- Frameworks: ${analysis.frameworks.join(", ")}`);
    console.log(`- Package Managers: ${analysis.packageManagers.join(", ")}`);
    console.log(`- Dependencies: ${Object.keys(analysis.dependencies).length}`);

    return analysis;
  }
}
