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

  // Enhanced prompt with all new features
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
      summarizedCodeSnippets,
      fullFileTree,
      apiEndpoints,
      envVariables,
      cicdConfig,
      testConfig,
      deploymentConfig,
      contributionGuide,
    } = analysis;

    // Combine all badges (auto-generated + custom)
    const allBadges = [...analysis.badges, ...customBadges];
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

    // NEW: Create sections for new features
    const cicdSection = cicdConfig
      ? `
**CI/CD Configuration:**
- Platform: ${cicdConfig.platform}
- Config File: ${cicdConfig.configFile}
- Workflows: ${cicdConfig.workflows?.join(", ") || "None"}
- Has Testing: ${cicdConfig.hasTesting ? "Yes" : "No"}
- Has Deployment: ${cicdConfig.hasDeployment ? "Yes" : "No"}
`
      : "";

    const testSection = testConfig
      ? `
**Testing Configuration:**
- Framework: ${testConfig.framework}
- Test Commands: ${testConfig.commands.join(", ")}
- Unit Tests: ${testConfig.unitTests ? "Yes" : "No"}
- E2E Tests: ${testConfig.e2eTests ? "Yes" : "No"}
- Coverage: ${testConfig.coverage ? "Yes" : "No"}
`
      : "";

    const deploymentSection = deploymentConfig
      ? `
**Deployment Configuration:**
- Platform: ${deploymentConfig.platform}
- Config Files: ${deploymentConfig.configFiles.join(", ")}
- Build Command: ${deploymentConfig.buildCommand || "Not specified"}
- Requires Environment Variables: ${deploymentConfig.requiresEnv ? "Yes" : "No"}
`
      : "";

    const contributionSection = `
**Contribution Guide:**
- Has Custom Guide: ${contributionGuide.hasCustomGuide ? "Yes" : "No"}
- Code of Conduct: ${contributionGuide.codeOfConduct ? "Yes" : "No"}
- Suggested Steps: ${contributionGuide.suggestedSteps.slice(0, 5).join(" → ")}
`;

    const enhancedCodeSnippets = summarizedCodeSnippets
      .map(
        (snippet: CodeSnippet) =>
          `---
File: ${snippet.fileName}
Features: ${snippet.detectedFeatures?.join(", ") || "None detected"}
Complexity: ${snippet.complexity || "Unknown"}
Main Function: ${snippet.mainFunction || "Not identified"}
Content Preview:
\`\`\`${mainLanguage.toLowerCase()}
${snippet.content.slice(0, 400)}...
\`\`\`
---`
      )
      .join("\n");

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

${cicdSection}
${testSection}
${deploymentSection}
${contributionSection}

**3. ENVIRONMENT VARIABLES:**
${
  envVariables.length > 0
    ? envVariables
        .map(
          (v) =>
            `- ${v.key}: ${v.description || "Environment variable"}${
              v.required ? " (Required)" : ""
            }`
        )
        .join("\n")
    : "None specified"
}

**4. API ENDPOINTS:**
${
  apiEndpoints.length > 0
    ? apiEndpoints
        .map((e) => `- ${e.method} ${e.path}: ${e.description}`)
        .join("\n")
    : "None detected"
}

**5. FULL FILE TREE:**
\`\`\`
${fullFileTree}
\`\`\`

**6. ENHANCED CODE ANALYSIS:**
${enhancedCodeSnippets || "No key code snippets were analyzed."}

**7. DEPENDENCIES & SCRIPTS:**
- **Key Dependencies:** ${
      Object.keys(dependencies).slice(0, 10).join(", ") || "None"
    }
- **Available Scripts:** ${Object.keys(scripts).join(", ") || "None"}

**TASK:**
Based on ALL the information above, generate a high-quality README.md in ${language}. Include these sections:

1. **Project Title with Logo** (use a simple emoji or text-based logo)
2. **Badges Section** (Use this exact markdown): ${badgeMarkdown}
3. **Description** - Compelling project overview
4. **Features** - Bulleted list based on detected frameworks and code analysis
5. **Tech Stack** - Based on detected technologies
6. **Architecture Overview** - Brief explanation using the file tree
7. **Prerequisites** - System requirements
8. **Installation** - Step-by-step setup based on package managers detected
9. **Usage** - How to run the project with detected scripts
10. **API Documentation** - If endpoints were detected
11. **Environment Variables** - If any were found
12. **Testing** - If tests were detected, include test commands
13. **Deployment** - Include deployment instructions and badges based on detected platform
14. **CI/CD** - If workflows were detected
15. **Contributing** - Use the suggested steps from analysis
16. **License** - Based on detected license

${
  deploymentConfig?.platform === "vercel"
    ? `
**SPECIAL INSTRUCTION:** Include a "Deploy to Vercel" button:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=${repository.html_url})
`
    : ""
}

${
  deploymentConfig?.platform === "netlify"
    ? `
**SPECIAL INSTRUCTION:** Include a "Deploy to Netlify" button:
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=${repository.html_url})
`
    : ""
}

Generate ONLY the README.md content. Make it engaging, comprehensive, and professional.`;
  }

  // Enhanced architecture prompt with better analysis
  private createArchitecturePrompt(analysis: ProjectAnalysis): string {
    const {
      fullFileTree,
      frameworks,
      mainLanguage,
      deploymentConfig,
      cicdConfig,
    } = analysis;

    return `Create a Mermaid.js architecture diagram for this ${mainLanguage} project using ${frameworks.join(
      ", "
    )} framework(s).

Project Structure:
${fullFileTree}

Additional Context:
- Main Language: ${mainLanguage}
- Frameworks: ${frameworks.join(", ")}
- Has CI/CD: ${cicdConfig ? "Yes" : "No"}
- Deployment: ${deploymentConfig?.platform || "None"}

Create a 'graph TD' diagram showing:
1. User interaction flow
2. Main application components
3. Database/storage layers (if any)
4. External services/APIs
5. CI/CD pipeline (if detected)

Focus on the logical flow and main architectural components. Keep it simple but informative.
Generate ONLY the Mermaid syntax inside a markdown code block.`;
  }

  // NEW: Generate project logo as SVG
  async generateProjectLogo(analysis: ProjectAnalysis): Promise<string> {
    if (!analysis.projectLogo) return "";

    try {
      const prompt = `Create a simple, modern SVG logo for a ${
        analysis.mainLanguage
      } project called "${analysis.repository.name}".
      
Project Details:
- Name: ${analysis.repository.name}
- Description: ${analysis.repository.description}
- Main Language: ${analysis.mainLanguage}
- Topics: ${analysis.repository.topics.join(", ")}

Create a clean, minimalist SVG logo (64x64) with:
1. Simple geometric shapes
2. Modern color scheme appropriate for ${analysis.mainLanguage}
3. Text or initials if appropriate
4. Professional appearance

Return only the SVG code, no explanations.`;

      const output = await this.replicate.run(
        "ibm-granite/granite-3.3-8b-instruct",
        {
          input: {
            prompt: prompt,
            max_tokens: 800,
            temperature: 0.7,
          },
        }
      );

      const logoContent = Array.isArray(output)
        ? output.join("")
        : String(output);

      if (logoContent.includes("<svg")) {
        return logoContent.trim();
      } else {
        // Fallback: return the pre-generated logo
        return analysis.projectLogo.svgContent;
      }
    } catch (error) {
      console.error("Failed to generate AI logo:", error);
      return analysis.projectLogo?.svgContent || "";
    }
  }

  // NEW: Analyze code snippets with AI
  async analyzeCodeSnippets(
    codeSnippets: CodeSnippet[]
  ): Promise<CodeSnippet[]> {
    const analyzedSnippets: CodeSnippet[] = [];

    for (const snippet of codeSnippets.slice(0, 5)) {
      // Analyze first 5 snippets
      try {
        const prompt = `Analyze this code snippet and provide a concise summary:

File: ${snippet.fileName}
Code:
\`\`\`
${snippet.content.slice(0, 1000)}...
\`\`\`

Provide:
1. Main purpose (1-2 sentences)
2. Key features/functionality
3. Dependencies used
4. Architecture pattern (if any)

Keep the summary concise and technical.`;

        const output = await this.replicate.run(
          "ibm-granite/granite-3.3-8b-instruct",
          {
            input: {
              prompt: prompt,
              max_tokens: 300,
              temperature: 0.5,
            },
          }
        );

        const summary = Array.isArray(output)
          ? output.join("")
          : String(output);

        analyzedSnippets.push({
          ...snippet,
          summary: summary.trim() || snippet.summary,
        });
      } catch (error) {
        console.warn(`Failed to analyze ${snippet.fileName}:`, error);
        analyzedSnippets.push(snippet); // Keep original
      }
    }

    return analyzedSnippets;
  }

  async generateReadme(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate,
    language: ReadmeLanguage,
    customBadges: Badge[]
  ): Promise<string> {
    try {
      // NEW: Enhance code snippets with AI analysis
      const enhancedAnalysis = {
        ...analysis,
        summarizedCodeSnippets: await this.analyzeCodeSnippets(
          analysis.summarizedCodeSnippets
        ),
      };

      const prompt = this.createPrompt(
        enhancedAnalysis,
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
        max_tokens: 12000, // Increased for comprehensive README
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
      console.log("Generating enhanced architecture diagram...");

      const output = await this.replicate.run(
        "ibm-granite/granite-3.3-8b-instruct",
        {
          input: {
            prompt: prompt,
            max_tokens: 800, // Increased for more complex diagrams
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

  // Enhanced fallback README with all new features
  private generateFallbackReadme(analysis: ProjectAnalysis): string {
    const {
      repository,
      mainLanguage,
      frameworks,
      packageManagers,
      scripts,
      keyFiles,
      cicdConfig,
      testConfig,
      deploymentConfig,
      envVariables,
      apiEndpoints,
      contributionGuide,
    } = analysis;

    const installSection = this.generateInstallSection(packageManagers);
    const usageSection = this.generateUsageSection(scripts, packageManagers);
    const featuresSection = this.generateFeaturesSection(
      frameworks,
      keyFiles,
      mainLanguage,
      analysis
    );
    const badgesSection = this.generateBadges(repository, mainLanguage);

    // NEW: Generate test section
    const testSectionMarkdown = testConfig
      ? `
## 🧪 Testing

This project uses **${testConfig.framework}** for testing.

### Running Tests

\`\`\`bash
${testConfig.commands.join("\n")}
\`\`\`

- **Unit Tests:** ${testConfig.unitTests ? "✅ Available" : "❌ Not configured"}
- **E2E Tests:** ${testConfig.e2eTests ? "✅ Available" : "❌ Not configured"}  
- **Coverage:** ${testConfig.coverage ? "✅ Enabled" : "❌ Not enabled"}
`
      : "";

    // NEW: Generate deployment section
    const deploymentSectionMarkdown = deploymentConfig
      ? `
## 🚀 Deployment

This project is configured for deployment on **${deploymentConfig.platform}**.

${
  deploymentConfig.platform === "vercel"
    ? `
### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=${repository.html_url})

Or deploy manually:
\`\`\`bash
npm install -g vercel
vercel
\`\`\`
`
    : ""
}

${
  deploymentConfig.platform === "netlify"
    ? `
### Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=${repository.html_url})
`
    : ""
}

${
  deploymentConfig.requiresEnv
    ? `
**Environment Variables Required:** ✅
Make sure to configure your environment variables in your deployment platform.
`
    : ""
}
`
      : "";

    // NEW: Generate CI/CD section
    const cicdSectionMarkdown = cicdConfig
      ? `
## ⚙️ CI/CD

This project uses **${
          cicdConfig.platform
        }** for continuous integration and deployment.

- **Platform:** ${cicdConfig.platform}
- **Configuration:** \`${cicdConfig.configFile}\`
- **Workflows:** ${cicdConfig.workflows?.join(", ") || "Default"}
- **Automated Testing:** ${cicdConfig.hasTesting ? "✅ Enabled" : "❌ Disabled"}
- **Automated Deployment:** ${
          cicdConfig.hasDeployment ? "✅ Enabled" : "❌ Disabled"
        }
`
      : "";

    // NEW: Generate environment variables section
    const envSection =
      envVariables.length > 0
        ? `
## 🔐 Environment Variables

Create a \`.env\` file in the root directory with the following variables:

${envVariables
  .map(
    (env) => `
### \`${env.key}\`
- **Description:** ${env.description}
- **Required:** ${env.required ? "Yes" : "No"}
${env.defaultValue ? `- **Default:** \`${env.defaultValue}\`` : ""}
`
  )
  .join("")}

Example \`.env\` file:
\`\`\`env
${envVariables
  .map((env) => `${env.key}=${env.defaultValue || "your_value_here"}`)
  .join("\n")}
\`\`\`
`
        : "";

    // NEW: Generate API documentation section
    const apiSection =
      apiEndpoints.length > 0
        ? `
## 📡 API Documentation

This project exposes the following API endpoints:

${apiEndpoints
  .map(
    (endpoint) => `
### \`${endpoint.method} ${endpoint.path}\`

${endpoint.description}

${
  endpoint.parameters && endpoint.parameters.length > 0
    ? `
**Parameters:**
${endpoint.parameters
  .map(
    (param) =>
      `- \`${param.name}\` (${param.type})${
        param.required ? " - Required" : " - Optional"
      }`
  )
  .join("\n")}
`
    : ""
}

${
  endpoint.responses && endpoint.responses.length > 0
    ? `
**Responses:**
${endpoint.responses.map((response) => `- ${response}`).join("\n")}
`
    : ""
}
`
  )
  .join("")}
`
        : "";

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

${envSection}

${apiSection}

${testSectionMarkdown}

${cicdSectionMarkdown}

${deploymentSectionMarkdown}

## 📁 Project Structure

This project is built using **${mainLanguage}**${
      frameworks.length > 0 ? ` with ${frameworks.join(", ")}` : ""
    }.

Key files and directories:
${keyFiles.map((file) => `- \`${file}\``).join("\n")}

## 🤝 Contributing

${
  contributionGuide.hasCustomGuide
    ? "Please refer to our [Contributing Guide](./CONTRIBUTING.md) for detailed information."
    : "We welcome contributions! Here's how you can help:"
}

${contributionGuide.suggestedSteps
  .map((step, index) => `${index + 1}. **${step}**`)
  .join("\n")}

${
  contributionGuide.codeOfConduct
    ? "\nPlease note that this project is released with a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms."
    : ""
}

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
${frameworks.length > 0 ? `- Powered by ${frameworks.join(", ")}` : ""}

---

Made with ❤️ by the development team`;
  }

  // Enhanced badge generation
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

    // NEW: Add CI badge
    badges.push(
      `![CI](https://img.shields.io/github/actions/workflow/status/${repoPath}/ci.yml?branch=main&label=CI)`
    );

    return badges.join(" ");
  }

  // Enhanced features section with new detections
  private generateFeaturesSection(
    frameworks: string[],
    keyFiles: string[],
    language: string,
    analysis: ProjectAnalysis
  ): string {
    const features = [];

    if (language) features.push(`🔧 Built with **${language}**`);
    if (frameworks.length > 0)
      features.push(`⚡ Powered by **${frameworks.join(", ")}**`);

    // Infrastructure features
    if (keyFiles.includes("dockerfile")) features.push("🐳 Docker support");
    if (keyFiles.includes("docker-compose.yml"))
      features.push("🐳 Docker Compose ready");

    // CI/CD features
    if (analysis.cicdConfig) {
      features.push(`⚙️ ${analysis.cicdConfig.platform} CI/CD pipeline`);
      if (analysis.cicdConfig.hasTesting) features.push("🧪 Automated testing");
      if (analysis.cicdConfig.hasDeployment)
        features.push("🚀 Automated deployment");
    }

    // Testing features
    if (analysis.testConfig) {
      features.push(`🧪 ${analysis.testConfig.framework} testing framework`);
      if (analysis.testConfig.coverage)
        features.push("📊 Test coverage reporting");
      if (analysis.testConfig.e2eTests) features.push("🎭 End-to-end testing");
    }

    // Deployment features
    if (analysis.deploymentConfig) {
      features.push(
        `🚀 ${analysis.deploymentConfig.platform} deployment ready`
      );
      if (analysis.deploymentConfig.platform === "vercel") {
        features.push("⚡ One-click Vercel deployment");
      }
    }

    // API features
    if (analysis.apiEndpoints.length > 0) {
      features.push(`📡 ${analysis.apiEndpoints.length} API endpoints`);
    }

    // Environment configuration
    if (analysis.envVariables.length > 0) {
      features.push("🔐 Environment configuration support");
    }

    // Code quality features
    if (keyFiles.some((f) => f.includes("eslint") || f.includes("prettier"))) {
      features.push("✨ Code formatting and linting");
    }

    // Documentation features
    if (analysis.contributionGuide.hasCustomGuide) {
      features.push("📚 Comprehensive contribution guidelines");
    }
    if (analysis.contributionGuide.codeOfConduct) {
      features.push("🤝 Code of conduct");
    }

    // Default features
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
      const pm = packageManagers.includes("yarn")
        ? "yarn"
        : packageManagers.includes("pnpm")
        ? "pnpm"
        : "npm";

      return `### Prerequisites

- Node.js (version 16 or higher)
- ${pm} package manager

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd <repository-name>

# Install dependencies
${
  pm === "npm" ? "npm install" : pm === "yarn" ? "yarn install" : "pnpm install"
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
          packageManager === "npm" && script !== "start"
            ? `npm run ${script}`
            : packageManager === "npm" && script === "start"
            ? "npm start"
            : `${packageManager} ${script}`;

        let description = "";
        switch (script) {
          case "dev":
            description = "Start the development server";
            break;
          case "start":
            description = "Start the production server";
            break;
          case "build":
            description = "Build the project for production";
            break;
          case "test":
            description = "Run the test suite";
            break;
          case "lint":
            description = "Run code linting";
            break;
          default:
            description = `Run ${script} script`;
        }

        usageContent += `### ${description}\n`;
        usageContent += `\`\`\`bash\n${command}\n\`\`\`\n\n`;
      });
    } else {
      usageContent +=
        "Please refer to the project documentation for usage instructions.\n";
    }

    return usageContent.trim();
  }
}
