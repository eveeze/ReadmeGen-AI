import axios from "axios";
import {
  GitHubRepo,
  FileStructure,
  ProjectAnalysis,
  CodeSnippet,
  ApiEndpoint,
  EnvironmentVariable,
  Badge,
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
        });
      }
    }
    return codeSnippets;
  }

  private generateBadges(repo: GitHubRepo & { owner: string }): Badge[] {
    const badges: Badge[] = [];
    const repoPath = `${repo.owner}/${repo.name}`;

    if (repo.license) {
      badges.push({
        name: "License",
        url: `https://img.shields.io/github/license/${repoPath}`,
        link: `${repo.html_url}/blob/main/LICENSE`,
      });
    }

    badges.push({
      name: "Stars",
      url: `https://img.shields.io/github/stars/${repoPath}?style=social`,
      link: `${repo.html_url}/stargazers`,
    });

    badges.push({
      name: "Forks",
      url: `https://img.shields.io/github/forks/${repoPath}?style=social`,
      link: `${repo.html_url}/network/members`,
    });

    return badges;
  }

  async analyzeProject(owner: string, repo: string): Promise<ProjectAnalysis> {
    const repository = await this.getRepository(owner, repo);
    const structure = await this.getFileStructure(owner, repo);

    const [fullFileTree, summarizedCodeSnippets, badges] = await Promise.all([
      this.generateFileTree(owner, repo),
      this.analyzeCode(owner, repo, structure),
      this.generateBadges({ ...repository, owner, name: repo }),
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

    if (keyFiles.includes("package.json")) {
      packageManagers.push("npm");
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
        } catch (e) {
          console.warn("Failed to parse package.json");
        }
      }
    }

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
      apiEndpoints: [],
      envVariables: [],
      badges,
    };
  }
}
