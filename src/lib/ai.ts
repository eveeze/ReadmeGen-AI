import Replicate from "replicate";
import {
  ProjectAnalysis,
  ReadmeTemplate,
  GitHubRepo,
  CodeSnippet,
  ReadmeLanguage,
  Badge,
} from "@/types";

export class AIReadmeGenerator {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  // --- FUNGSI INI YANG DIPERBAIKI ---
  private createPrompt(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate,
    language: ReadmeLanguage,
    customBadges: Badge[]
  ): string {
    const {
      repository,
      mainLanguage,
      frameworks,
      packageManagers,
      dependencies,
      scripts,
      keyFiles,
      summarizedCodeSnippets,
      fullFileTree,
      apiEndpoints,
      envVariables,
    } = analysis;

    // Menggabungkan badge otomatis dari analisis dan badge kustom dari pengguna
    const allBadges = [...analysis.badges, ...customBadges];
    // Membuat blok markdown lengkap untuk semua badge
    const badgeMarkdown = allBadges
      .map(
        (badge) =>
          `[![${badge.name}](${badge.url})](${badge.link || badge.url})`
      )
      .join(" ");

    let styleGuidance = "";
    switch (template) {
      case "Profesional":
        styleGuidance =
          "Use a formal and professional tone. Focus on clarity, structure, and comprehensive documentation.";
        break;
      case "Fun/Creative":
        styleGuidance =
          "Use a more casual, engaging, and creative tone. Feel free to use emojis and a bit of humor to make the README more approachable.";
        break;
      case "Dasar":
      default:
        styleGuidance =
          "Use a straightforward and clear tone. Provide the essential information in a well-organized manner.";
        break;
    }

    return `Generate a comprehensive, professional README.md for a GitHub repository in ${language}.
Style Guidance: ${styleGuidance}

**1. REPOSITORY INFORMATION:**
- Name: ${repository.name}
- Description: ${repository.description || "No description provided."}
- Main Language: ${mainLanguage}
- Topics: ${repository.topics.join(", ") || "None"}
- License: ${repository.license?.name || "Not specified"}

**2. DETAILED PROJECT ANALYSIS:**
- **Frameworks & Key Libraries:** ${frameworks.join(", ") || "None detected"}
- **Package Managers:** ${packageManagers.join(", ") || "None detected"}
- **Required Environment Variables:** ${
      envVariables.length > 0
        ? envVariables.map((v) => v.key).join(", ")
        : "None specified"
    }
- **Detected API Endpoints:** ${
      apiEndpoints.length > 0
        ? apiEndpoints.map((e) => `${e.method} ${e.path}`).join("\n")
        : "None detected"
    }

**3. FULL FILE TREE:**
\`\`\`
${fullFileTree}
\`\`\`

**4. SUMMARIZED CODE SNIPPETS:**
${
  summarizedCodeSnippets.length > 0
    ? summarizedCodeSnippets
        .map(
          (snippet: CodeSnippet) =>
            `---
File: ${snippet.fileName}
Content:
\`\`\`${mainLanguage.toLowerCase()}
${snippet.content.slice(0, 500)}...
\`\`\`
---`
        )
        .join("\n")
    : "No key code snippets were analyzed."
}

**5. DEPENDENCIES & SCRIPTS:**
- **Key Dependencies:** ${
      Object.keys(dependencies).slice(0, 10).join(", ") || "None"
    }
- **Available Scripts:** ${Object.keys(scripts).join(", ") || "None"}

**TASK:**
Based on ALL the information above, generate a high-quality README.md in ${language}. Infer the project's purpose and features. Include these sections:
1.  Project Title and a compelling one-line description.
2.  Badges Section (Use this exact markdown block for the badges): ${badgeMarkdown}
3.  Features (in a bulleted list).
4.  Tech Stack/Technologies Used.
5.  Architecture Overview (briefly explain the structure based on the file tree).
6.  Prerequisites and Installation steps.
7.  Usage/Running the Project (explain the main scripts).
8.  API Endpoints (if any were detected).
9.  Contributing guidelines.
10. License information.

Generate ONLY the README.md content itself. Do not add any extra commentary before or after the markdown.`;
  }

  private createArchitecturePrompt(analysis: ProjectAnalysis): string {
    const { fullFileTree } = analysis;
    return `Based on the following file structure, generate a simple architecture diagram in Mermaid.js syntax.
Focus ONLY on the main components and their relationships. Use a 'graph TD' (top-down) layout.

File Structure:
${fullFileTree}

IMPORTANT: Generate ONLY the Mermaid.js syntax inside a markdown code block. Do NOT include any other text or explanation.`;
  }

  async generateReadme(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate,
    language: ReadmeLanguage,
    customBadges: Badge[]
  ): Promise<string> {
    try {
      const prompt = this.createPrompt(
        analysis,
        template,
        language,
        customBadges
      );
      console.log(
        `Starting AI generation with template: ${template} in ${language}`
      );

      let readmeContent = "";
      const input = {
        prompt: prompt,
        max_tokens: 8192,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1.1,
      };

      for await (const event of this.replicate.stream(
        "ibm-granite/granite-3.3-8b-instruct",
        { input }
      )) {
        readmeContent += String(event);
      }

      console.log(
        `AI generation completed. Generated ${readmeContent.length} characters`
      );

      if (!readmeContent || readmeContent.trim().length === 0) {
        console.warn("AI generated empty content, falling back to template");
        throw new Error("AI generated empty content");
      }

      return readmeContent.trim();
    } catch (error) {
      console.error("IBM Granite 3.3 AI generation error:", error);
      if (error instanceof Error) {
        if (
          error.message.includes("insufficient credits") ||
          error.message.includes("billing") ||
          error.message.includes("quota")
        ) {
          throw new Error(
            "Insufficient Replicate credits. Please check your billing."
          );
        }
        if (error.message.includes("rate limit")) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (
          error.message.includes("model not found") ||
          error.message.includes("Invalid version")
        ) {
          throw new Error(
            "AI model not available. Please check the model version or your access permissions."
          );
        }
        if (error.message.includes("timeout")) {
          throw new Error(
            "Request timeout. The AI service is taking too long to respond."
          );
        }
        throw error;
      }
      console.log("Falling back to template README generation");
      return this.generateFallbackReadme(analysis);
    }
  }

  async generateArchitectureDiagram(
    analysis: ProjectAnalysis
  ): Promise<string> {
    try {
      const prompt = this.createArchitecturePrompt(analysis);
      console.log("Generating architecture diagram...");

      const output = await this.replicate.run(
        "ibm-granite/granite-3.3-8b-instruct",
        {
          input: {
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.5,
          },
        }
      );

      const diagramContent = Array.isArray(output)
        ? output.join("")
        : String(output);

      if (diagramContent.includes("```mermaid")) {
        console.log("Architecture diagram generation completed.");
        return diagramContent.trim();
      } else {
        console.warn(
          "AI did not return a valid Mermaid block. Returning empty."
        );
        return "";
      }
    } catch (error) {
      console.error("Failed to generate architecture diagram:", error);
      return "";
    }
  }

  private generateFallbackReadme(analysis: ProjectAnalysis): string {
    const {
      repository,
      mainLanguage,
      frameworks,
      packageManagers,
      scripts,
      keyFiles,
    } = analysis;

    const installSection = this.generateInstallSection(packageManagers);
    const usageSection = this.generateUsageSection(scripts, packageManagers);
    const featuresSection = this.generateFeaturesSection(
      frameworks,
      keyFiles,
      mainLanguage
    );
    const badgesSection = this.generateBadges(repository, mainLanguage);

    return `${badgesSection}

# ${repository.name}

${
  repository.description ||
  "A modern project built with cutting-edge technologies."
}

${featuresSection}

## 🚀 Quick Start

${installSection}

${usageSection}

## 📁 Project Structure

This project is built using **${mainLanguage}**${
      frameworks.length > 0 ? ` with ${frameworks.join(", ")}` : ""
    }.

Key files and directories:
${keyFiles.map((file) => `- \`${file}\``).join("\n")}

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1.  **Fork the repository**
2.  **Create a feature branch**
    \`\`\`bash
    git checkout -b feature/amazing-feature
    \`\`\`
3.  **Make your changes**
4.  **Run tests** (if available)
5.  **Commit your changes**
    \`\`\`bash
    git commit -m 'Add some amazing feature'
    \`\`\`
6.  **Push to the branch**
    \`\`\`bash
    git push origin feature/amazing-feature
    \`\`\`
7.  **Open a Pull Request**

## 📝 License

${
  repository.license
    ? `This project is licensed under the ${repository.license.name} License.`
    : "License information not specified."
}

## 🌟 Support

- ⭐ Star this repository if it helped you!
- 🐛 [Report issues](${repository.html_url}/issues)
- 💡 [Request features](${repository.html_url}/issues/new)

## 🙏 Acknowledgments

- Built with modern development tools and best practices
- Thanks to all contributors and the open-source community

---

Made with ❤️ by the development team`;
  }

  private generateBadges(repository: GitHubRepo, language: string): string {
    const repoPath = new URL(repository.html_url).pathname.substring(1);
    const badges = [
      `![GitHub stars](https://img.shields.io/github/stars/${repoPath}?style=social)`,
      `![GitHub forks](https://img.shields.io/github/forks/${repoPath}?style=social)`,
    ];

    if (repository.license) {
      badges.push(
        `![GitHub license](https://img.shields.io/github/license/${repoPath})`
      );
    }

    if (language) {
      badges.push(
        `![Language](https://img.shields.io/badge/language-${encodeURIComponent(
          language
        )}-blue)`
      );
    }

    return badges.join(" ");
  }

  private generateFeaturesSection(
    frameworks: string[],
    keyFiles: string[],
    language: string
  ): string {
    const features = [];

    if (language) features.push(`🔧 Built with **${language}**`);
    if (frameworks.length > 0)
      features.push(`⚡ Powered by **${frameworks.join(", ")}**`);

    if (keyFiles.includes("dockerfile")) features.push("🐳 Docker support");
    if (keyFiles.includes("docker-compose.yml"))
      features.push("🐳 Docker Compose ready");
    if (keyFiles.includes(".github")) features.push("⚙️ GitHub Actions CI/CD");
    if (keyFiles.some((f) => f.includes("test")))
      features.push("🧪 Comprehensive testing");
    if (keyFiles.includes("contributing.md"))
      features.push("👥 Community-friendly");

    features.push("📚 Well-documented codebase");
    features.push("🚀 Modern development workflow");

    return `## ✨ Features

${features.map((f) => `- ${f}`).join("\n")}`;
  }

  private generateInstallSection(packageManagers: string[]): string {
    if (
      packageManagers.includes("npm") ||
      packageManagers.includes("yarn") ||
      packageManagers.includes("pnpm")
    ) {
      return `### Prerequisites

- Node.js (version 16 or higher)
- npm, yarn, or pnpm

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
${
  packageManagers.includes("yarn")
    ? "yarn install"
    : packageManagers.includes("pnpm")
    ? "pnpm install"
    : "npm install"
}
\`\`\``;
    }

    if (packageManagers.includes("pip")) {
      return `### Prerequisites

- Python 3.8 or higher
- pip package manager

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
\`\`\``;
    }

    return `### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Follow the setup instructions for your specific environment
\`\`\``;
  }

  private generateUsageSection(
    scripts: Record<string, string>,
    packageManagers: string[]
  ): string {
    if (Object.keys(scripts).length === 0) {
      return `## 💻 Usage

Please refer to the project documentation for detailed usage instructions.`;
    }

    const packageManager = packageManagers.includes("yarn")
      ? "yarn"
      : packageManagers.includes("pnpm")
      ? "pnpm"
      : "npm";

    const commonScripts = ["dev", "start", "build", "test", "lint"];
    const availableScripts = Object.keys(scripts).filter((script) =>
      commonScripts.includes(script)
    );

    let usageContent = "## 💻 Usage\n\n";

    if (availableScripts.length > 0) {
      usageContent += "Available commands:\n\n";

      availableScripts.forEach((script) => {
        const command =
          packageManager === "npm"
            ? `npm run ${script}`
            : `${packageManager} ${script}`;
        usageContent += `### ${
          script.charAt(0).toUpperCase() + script.slice(1)
        }\n`;
        usageContent += `\`\`\`bash\n${command}\n\`\`\`\n\n`;
      });
    } else {
      usageContent +=
        "Please refer to the project documentation for usage instructions.\n";
    }

    return usageContent.trim();
  }
}
