import Replicate from "replicate";
import {
  ProjectAnalysis,
  ReadmeTemplate,
  GitHubRepo,
  CodeSnippet,
} from "@/types";

export class AIReadmeGenerator {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  private createPrompt(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate
  ): string {
    const {
      repository,
      mainLanguage,
      frameworks,
      packageManagers,
      dependencies,
      scripts,
      keyFiles,
      summarizedCodeSnippets, // Perbaikan: Menggunakan nama properti yang baru
      fullFileTree,
      apiEndpoints,
      envVariables,
    } = analysis;

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

    // Prompt yang disempurnakan dengan data analisis yang lebih kaya
    return `Generate a comprehensive, professional README.md for a GitHub repository.
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
- **Key Configuration & Documentation Files:** ${keyFiles.join(", ")}
- **Required Environment Variables (.env.example):** ${
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
Content Summary: The AI should infer the purpose of this file from its content.
Content:
\`\`\`${mainLanguage.toLowerCase()}
${snippet.content}
\`\`\`
---`
        )
        .join("\n")
    : "No key code snippets were analyzed."
}

**5. DEPENDENCIES & SCRIPTS:**
- **Key Dependencies (up to 10):**
${
  Object.keys(dependencies).length > 0
    ? Object.entries(dependencies)
        .slice(0, 10)
        .map(([pkg, version]) => `  - ${pkg}: ${version}`)
        .join("\n")
    : "  - None"
}
- **Available Scripts:**
${
  Object.keys(scripts).length > 0
    ? Object.entries(scripts)
        .map(([name, command]) => `  - ${name}: "${command}"`)
        .join("\n")
    : "  - None"
}

**TASK:**
Based on ALL the information above (especially the file tree and code snippets), generate a high-quality README.md. Infer the project's purpose and features. Include these sections:
1.  Project Title and a compelling one-line description.
2.  Features (in a bulleted list).
3.  Tech Stack/Technologies Used.
4.  Architecture Overview (briefly explain the structure based on the file tree).
5.  Prerequisites and Installation steps (mention the environment variables).
6.  Usage/Running the Project (explain the main scripts).
7.  API Endpoints (if any were detected).
8.  Contributing guidelines.
9.  License information.

Generate ONLY the README.md content itself. Do not add any extra commentary before or after the markdown.`;
  }

  private createArchitecturePrompt(analysis: ProjectAnalysis): string {
    const { fullFileTree } = analysis; // Menggunakan fullFileTree untuk konteks yang lebih baik
    return `Based on the following file structure, generate a simple architecture diagram in Mermaid.js syntax.
Focus ONLY on the main components and their relationships. Use a 'graph TD' (top-down) layout.

File Structure:
${fullFileTree}

IMPORTANT: Generate ONLY the Mermaid.js syntax inside a markdown code block. Do NOT include any other text or explanation.
Example of a valid response:
\`\`\`mermaid
graph TD;
    A["User"] --> B["Web App (Next.js)"];
    B --> C{"API Routes (/api/*)"};
    C --> D[("Database/External Service")];
\`\`\``;
  }

  async generateReadme(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate
  ): Promise<string> {
    try {
      const prompt = this.createPrompt(analysis, template);
      console.log(`Starting AI generation with template: ${template}`);

      let readmeContent = "";
      const input = {
        prompt: prompt,
        max_tokens: 8192, // Menaikkan token untuk output yang lebih panjang dan lengkap
        temperature: 0.7,
        top_p: 0.9,
        top_k: 50,
        repetition_penalty: 1.1,
      };

      for await (const event of this.replicate.stream(
        "ibm-granite/granite-3.3-8b-instruct",
        { input }
      )) {
        if (typeof event === "string") {
          readmeContent += event;
        } else {
          readmeContent += String(event);
        }
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

      // Simple validation: check if the output contains the mermaid block
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
      return ""; // Return empty string on error
    }
  }

  // Fallback methods remain the same
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
    const badges = [
      `![GitHub stars](https://img.shields.io/github/stars/${repository.html_url
        .split("/")
        .slice(-2)
        .join("/")}?style=social)`,
      `![GitHub forks](https://img.shields.io/github/forks/${repository.html_url
        .split("/")
        .slice(-2)
        .join("/")}?style=social)`,
      `![GitHub license](https://img.shields.io/github/license/${repository.html_url
        .split("/")
        .slice(-2)
        .join("/")})`,
    ];

    if (language) {
      badges.push(
        `![Language](https://img.shields.io/badge/language-${language}-blue)`
      );
    }

    return badges.join("\n");
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
