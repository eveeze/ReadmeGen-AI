import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Badge,
  CICDConfig,
  TestConfig,
  DeploymentConfig,
  ProjectAnalysis, // Impor tipe ProjectAnalysis
} from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractGitHubInfo(
  url: string
): { owner: string; repo: string } | null {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(regex);

  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(".git", ""),
  };
}

export function validateGitHubUrl(url: string): boolean {
  const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[^\/]+\/[^\/]+\/?$/;
  return githubUrlRegex.test(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error("Failed to copy text: ", fallbackErr);
      return false;
    }
  }
}

export function formatFileSize(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
}

// NEW: Generate deployment badges based on detected platform
export function generateDeploymentBadge(
  deploymentConfig: DeploymentConfig,
  repoUrl: string
): Badge[] {
  const badges: Badge[] = [];

  switch (deploymentConfig.platform) {
    case "vercel":
      badges.push({
        name: "Deploy to Vercel",
        url: "https://img.shields.io/badge/deploy-vercel-black?style=for-the-badge&logo=vercel",
        link: `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
          repoUrl
        )}`,
        category: "deployment",
      });
      break;

    case "netlify":
      badges.push({
        name: "Deploy to Netlify",
        url: "https://img.shields.io/badge/deploy-netlify-00C7B7?style=for-the-badge&logo=netlify",
        link: `https://app.netlify.com/start/deploy?repository=${encodeURIComponent(
          repoUrl
        )}`,
        category: "deployment",
      });
      break;

    case "heroku":
      badges.push({
        name: "Deploy to Heroku",
        url: "https://img.shields.io/badge/deploy-heroku-430098?style=for-the-badge&logo=heroku",
        link: `https://heroku.com/deploy?template=${encodeURIComponent(
          repoUrl
        )}`,
        category: "deployment",
      });
      break;

    case "docker":
      badges.push({
        name: "Docker",
        url: "https://img.shields.io/badge/docker-ready-2496ED?style=for-the-badge&logo=docker",
        link: repoUrl,
        category: "deployment",
      });
      break;
  }

  return badges;
}

// NEW: Generate CI/CD badges
export function generateCICDBadges(
  cicdConfig: CICDConfig,
  repoPath: string
): Badge[] {
  const badges: Badge[] = [];

  switch (cicdConfig.platform) {
    case "github-actions":
      if (cicdConfig.workflows && cicdConfig.workflows.length > 0) {
        const mainWorkflow = cicdConfig.workflows[0];
        badges.push({
          name: "CI",
          url: `https://img.shields.io/github/actions/workflow/status/${repoPath}/${mainWorkflow}.yml?branch=main&label=CI&style=for-the-badge`,
          link: `https://github.com/${repoPath}/actions`,
          category: "build",
        });
      }
      break;

    case "travis":
      badges.push({
        name: "Travis CI",
        url: `https://img.shields.io/travis/com/${repoPath}/main?style=for-the-badge&logo=travis`,
        link: `https://travis-ci.com/${repoPath}`,
        category: "build",
      });
      break;

    case "circleci":
      badges.push({
        name: "CircleCI",
        url: `https://img.shields.io/circleci/build/github/${repoPath}/main?style=for-the-badge&logo=circleci`,
        link: `https://circleci.com/gh/${repoPath}`,
        category: "build",
      });
      break;
  }

  return badges;
}

// NEW: Generate test coverage badges
export function generateTestBadges(
  testConfig: TestConfig,
  repoPath: string
): Badge[] {
  const badges: Badge[] = [];

  if (testConfig.coverage) {
    badges.push({
      name: "Coverage",
      url: `https://img.shields.io/codecov/c/github/${repoPath}?style=for-the-badge&logo=codecov`,
      link: `https://codecov.io/gh/${repoPath}`,
      category: "coverage",
    });
  }

  if (testConfig.framework) {
    const frameworkBadge = getTestFrameworkBadge(testConfig.framework);
    if (frameworkBadge) {
      badges.push({
        name: testConfig.framework,
        url: frameworkBadge.url,
        link: frameworkBadge.link || `https://github.com/${repoPath}`,
        category: "build",
      });
    }
  }

  return badges;
}

// NEW: Get test framework specific badge
function getTestFrameworkBadge(
  framework: string
): { url: string; link?: string } | null {
  const badges: Record<string, { url: string; link?: string }> = {
    Jest: {
      url: "https://img.shields.io/badge/tested_with-jest-99424f?style=for-the-badge&logo=jest",
      link: "https://jestjs.io/",
    },
    Cypress: {
      url: "https://img.shields.io/badge/tested_with-cypress-04C38E?style=for-the-badge&logo=cypress",
      link: "https://cypress.io/",
    },
    Playwright: {
      url: "https://img.shields.io/badge/tested_with-playwright-2EAD33?style=for-the-badge&logo=playwright",
      link: "https://playwright.dev/",
    },
    Vitest: {
      url: "https://img.shields.io/badge/tested_with-vitest-6E9F18?style=for-the-badge&logo=vitest",
      link: "https://vitest.dev/",
    },
    Mocha: {
      url: "https://img.shields.io/badge/tested_with-mocha-8D6748?style=for-the-badge&logo=mocha",
      link: "https://mochajs.org/",
    },
  };

  return badges[framework] || null;
}

// NEW: Format analysis duration
export function formatAnalysisDuration(startTime: Date, endTime: Date): string {
  const duration = endTime.getTime() - startTime.getTime();
  const seconds = Math.floor(duration / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

// NEW: Generate comprehensive project statistics
export function generateProjectStats(analysisData: ProjectAnalysis) {
  const stats = {
    complexity: "Unknown" as "Low" | "Medium" | "High" | "Unknown",
    techStack: [] as string[],
    maturityScore: 0,
    features: [] as string[],
  };

  // Calculate complexity based on various factors
  let complexityScore = 0;

  if (analysisData.apiEndpoints.length > 0) {
    complexityScore += analysisData.apiEndpoints.length * 2;
  }

  if (analysisData.envVariables.length > 0) {
    complexityScore += analysisData.envVariables.length;
  }

  if (analysisData.summarizedCodeSnippets.length > 0) {
    complexityScore += analysisData.summarizedCodeSnippets.length;
  }

  if (analysisData.frameworks.length > 0) {
    complexityScore += analysisData.frameworks.length * 5;
  }

  // Determine complexity level
  if (complexityScore < 10) {
    stats.complexity = "Low";
  } else if (complexityScore < 30) {
    stats.complexity = "Medium";
  } else {
    stats.complexity = "High";
  }

  // Build tech stack
  if (analysisData.mainLanguage) {
    stats.techStack.push(analysisData.mainLanguage);
  }

  if (analysisData.frameworks) {
    stats.techStack.push(...analysisData.frameworks);
  }

  // Calculate maturity score
  let maturityScore = 0;

  if (analysisData.cicdConfig) maturityScore += 20;
  if (analysisData.testConfig) maturityScore += 25;
  if (analysisData.deploymentConfig) maturityScore += 15;
  if (analysisData.contributionGuide.hasCustomGuide) maturityScore += 10;
  if (analysisData.contributionGuide.codeOfConduct) maturityScore += 10;
  if (analysisData.envVariables.length > 0) maturityScore += 10;
  if (analysisData.hasDocumentation) maturityScore += 10;

  stats.maturityScore = Math.min(maturityScore, 100);

  // Compile features list
  if (analysisData.cicdConfig) stats.features.push("CI/CD Pipeline");
  if (analysisData.testConfig) stats.features.push("Automated Testing");
  if (analysisData.deploymentConfig) stats.features.push("Deployment Ready");
  if (analysisData.apiEndpoints.length > 0) stats.features.push("REST API");
  if (analysisData.envVariables.length > 0)
    stats.features.push("Environment Config");

  return stats;
}

// NEW: Create deployment instructions
export function createDeploymentInstructions(
  deploymentConfig: DeploymentConfig,
  repoUrl: string,
  hasEnvVars: boolean
): string {
  const instructions: string[] = [];

  switch (deploymentConfig.platform) {
    case "vercel":
      instructions.push("## 🚀 Deploy to Vercel");
      instructions.push("");
      instructions.push(
        "[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=" +
          encodeURIComponent(repoUrl) +
          ")"
      );
      instructions.push("");
      instructions.push("Or deploy manually:");
      instructions.push("```bash");
      instructions.push("npm install -g vercel");
      instructions.push("vercel");
      instructions.push("```");

      if (hasEnvVars) {
        instructions.push("");
        instructions.push(
          "**Note:** Make sure to configure your environment variables in the Vercel dashboard."
        );
      }
      break;

    case "netlify":
      instructions.push("## 🚀 Deploy to Netlify");
      instructions.push("");
      instructions.push(
        "[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=" +
          encodeURIComponent(repoUrl) +
          ")"
      );
      instructions.push("");
      instructions.push("Or deploy manually:");
      instructions.push("```bash");
      instructions.push("npm install -g netlify-cli");
      instructions.push("npm run build");
      instructions.push("netlify deploy --prod --dir=build");
      instructions.push("```");
      break;

    case "heroku":
      instructions.push("## 🚀 Deploy to Heroku");
      instructions.push("");
      instructions.push(
        "[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=" +
          encodeURIComponent(repoUrl) +
          ")"
      );
      instructions.push("");
      instructions.push("Or deploy manually:");
      instructions.push("```bash");
      instructions.push("heroku create your-app-name");
      instructions.push("git push heroku main");
      instructions.push("```");
      break;

    case "docker":
      instructions.push("## 🐳 Docker Deployment");
      instructions.push("");
      instructions.push("Build and run with Docker:");
      instructions.push("```bash");
      instructions.push("docker build -t your-app-name .");
      instructions.push("docker run -p 3000:3000 your-app-name");
      instructions.push("```");

      if (deploymentConfig.configFiles.includes("docker-compose.yml")) {
        instructions.push("");
        instructions.push("Or use Docker Compose:");
        instructions.push("```bash");
        instructions.push("docker-compose up -d");
        instructions.push("```");
      }
      break;
  }

  return instructions.join("\n");
}
