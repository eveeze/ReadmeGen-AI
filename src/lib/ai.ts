import Replicate from "replicate";
import { ProjectAnalysis, ReadmeTemplate, GitHubRepo } from "@/types";

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
      codeSnippets,
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

    return `Generate a comprehensive, professional README.md for this GitHub repository.
Style Guidance: ${styleGuidance}

REPOSITORY INFORMATION:
- Name: ${repository.name}
- Description: ${repository.description}
- Main Language: ${mainLanguage}
- Stars: ${repository.stars}
- Forks: ${repository.forks}
- Topics: ${repository.topics.join(", ")}
- License: ${repository.license?.name || "Not specified"}

PROJECT ANALYSIS:
- Frameworks detected: ${frameworks.join(", ") || "None detected"}
- Package managers: ${packageManagers.join(", ") || "None detected"}
- Key files found: ${keyFiles.join(", ")}
${
  codeSnippets.length > 0
    ? `
CODE SNIPPETS ANALYSIS:
${codeSnippets
  .map(
    (snippet) =>
      `---
File: ${snippet.fileName}
Content:
${snippet.content}
---`
  )
  .join("\n")}
Based on these snippets, infer the main functionalities of the project.
`
    : ""
}

DEPENDENCIES (top 10):
${Object.entries(dependencies)
  .slice(0, 10)
  .map(([pkg, version]) => `- ${pkg}: ${version}`)
  .join("\n")}

AVAILABLE SCRIPTS:
${Object.entries(scripts)
  .map(([name, command]) => `- ${name}: ${command}`)
  .join("\n")}

Generate a README.md that includes:
1.  Project title and description
2.  Features section (infer from dependencies, structure, and code snippets)
3.  Installation instructions
4.  Usage examples
5.  Contributing guidelines
6.  License information

Generate ONLY the README.md content, no additional commentary.`;
  }

  private createArchitecturePrompt(analysis: ProjectAnalysis): string {
    const { structure } = analysis;
    return `Based on the following file structure, generate a simple architecture diagram in Mermaid.js syntax.
Focus ONLY on the main components and their relationships. Use a 'graph TD' (top-down) layout.

File Structure:
${structure.map((item) => `- ${item.path} (${item.type})`).join("\n")}

IMPORTANT: Generate ONLY the Mermaid.js syntax inside a markdown code block. Do NOT include any other text or explanation.
Example of a valid response:
\`\`\`mermaid
graph TD;
    A["User"] --> B["Web App"];
    B --> C{"API Server"};
    C --> D[("Database")];
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
        max_tokens: 2500,
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
