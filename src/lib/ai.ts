import Replicate from "replicate";
import {
  ProjectAnalysis,
  ReadmeTemplate,
  GitHubRepo,
  CodeSnippet,
  ReadmeLanguage,
  Badge,
  AgenticQuestion,
} from "@/types";

export class AIReadmeGenerator {
  private replicate: Replicate;

  constructor(apiToken: string) {
    this.replicate = new Replicate({
      auth: apiToken,
    });
  }

  // FUNGSI BARU: Membuat prompt untuk menghasilkan pertanyaan
  private createQuestionPrompt(analysis: ProjectAnalysis): string {
    return `
      Based on the following GitHub repository analysis, generate 3-5 clarifying questions for the user.
      These questions should aim to gather information that cannot be inferred from the code alone, to create a high-quality README.md.
      Focus on: project's main purpose, complex setup instructions, contribution nuances, or live demo information.
      Return the questions as a JSON array of objects, where each object has an "id" (a unique string) and a "question" key.

      **Project Analysis:**
      - Name: ${analysis.repository.name}
      - Description: ${analysis.repository.description || "N/A"}
      - Main Language: ${analysis.mainLanguage}
      - Frameworks: ${analysis.frameworks.join(", ") || "None"}
      - Key Dependencies: ${Object.keys(analysis.dependencies)
        .slice(0, 10)
        .join(", ")}
      - Scripts: ${Object.keys(analysis.scripts).join(", ")}
      - CI/CD Detected: ${analysis.cicdConfig?.platform || "No"}
      - Deployment Detected: ${analysis.deploymentConfig?.platform || "No"}

      Example questions to generate:
      [
        {"id": "q1", "question": "What is the primary goal of this project? What problem does it solve for users?"},
        {"id": "q2", "question": "Are there any complex environment variables or secrets needed for local setup besides what's in .env.example?"},
        {"id": "q3", "question": "Is there a live demo or deployed version of this project? If so, what is the URL?"}
      ]

      Generate ONLY the JSON array. Do not include any other text or markdown formatting.
    `;
  }

  // FUNGSI BARU: Memanggil AI untuk mendapatkan pertanyaan
  async generateClarifyingQuestions(
    analysis: ProjectAnalysis
  ): Promise<AgenticQuestion[]> {
    try {
      const prompt = this.createQuestionPrompt(analysis);
      const output = await this.replicate.run(
        "ibm-granite/granite-3.3-8b-instruct",
        {
          input: {
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.6,
          },
        }
      );

      const jsonString = Array.isArray(output)
        ? output.join("").trim()
        : String(output).trim();

      // Ekstrak konten JSON dari string
      const startIndex = jsonString.indexOf("[");
      const endIndex = jsonString.lastIndexOf("]");
      if (startIndex !== -1 && endIndex !== -1) {
        const validJson = jsonString.substring(startIndex, endIndex + 1);
        return JSON.parse(validJson);
      }
      console.warn("AI did not return a valid JSON array for questions.");
      return [];
    } catch (error) {
      console.error("Failed to generate clarifying questions:", error);
      return []; // Kembalikan array kosong jika gagal
    }
  }

  // Enhanced prompt with all new features and consistent structure
  private createPrompt(
    analysis: ProjectAnalysis,
    template: ReadmeTemplate,
    language: ReadmeLanguage,
    customBadges: Badge[],
    userAnswers?: Record<string, string>,
    logoUrl?: string
  ): string {
    const {
      repository,
      mainLanguage,
      projectType,
      frameworks,
      packageManagers,
      categorizedDependencies,
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

    let logoSection = "";
    if (logoUrl && logoUrl.trim()) {
      logoSection = `<p align="center"><img src="${logoUrl.trim()}" alt="Project Logo" width="130"></p>`;
    } else if (analysis.projectLogo?.svgContent) {
      logoSection = `<p align="center">${analysis.projectLogo.svgContent}</p>`;
    }

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

    const userAnswersSection =
      userAnswers && Object.keys(userAnswers).length > 0
        ? `
**ADDITIONAL USER-PROVIDED CONTEXT (Use this to enrich the description, but analysis details take precedence if there is a conflict):**
${Object.entries(userAnswers)
  .map(
    ([question, answer]) =>
      `- User Question: ${question}\n  - User Answer: ${answer}`
  )
  .join("\n")}
`
        : "";

    // --- PROMPT UTAMA YANG DIPERBAIKI ---
    return `
            You are an expert technical writer. Generate a comprehensive, professional README.md in ${language}.
            **Your single source of truth is the 'DEEP PROJECT ANALYSIS DETAILS' section below.**
            Adhere strictly to these rules:
            1.  **DO NOT** infer or invent any features, technologies, or configurations that are not explicitly listed in the analysis.
            2.  If information is missing (e.g., project's primary purpose), state that it needs to be described, do not make it up.
            3.  Use the provided file summaries and project structure to accurately describe the project's functionality.
            4.  Follow the requested structure precisely.

            **1. Header**:
            ${logoSection}
            <h1 align="center">${repository.name}</h1>
            <p align="center">${
              repository.description || "A brief description of the project."
            }</p>
            <p align="center">Get started by ... (fill in a brief, relevant call to action based on the project type: e.g., 'deploying your own instance' or 'installing the CLI tool')</p>
            <div align="center">${badgeMarkdown}</div>

            **2. Table of Contents**: (Generate this based on the sections you create)

            **3. About The Project**:
            Provide a detailed overview. Explain the "why" behind it, not just the "what". Base this section *strictly* on the repository description, project type, and key file summaries from the analysis.

            **4. Getting Started**:
            Provide clear, step-by-step instructions. Use the detected package managers and 'build'/'dev' scripts to write accurate installation and startup commands.

            **5. Features**:
            List the key features. Deduce features *only* from the analysis data: frameworks used, CI/CD, testing setup, Docker support, API endpoints, etc.

            **6. Tech Stack**:
            List the technologies used. Use the 'Technology Stack' and 'Categorized Dependencies' from the analysis for a well-structured list.

            **7. Configuration**:
            If environment variables are detected in the analysis, explain how to set them up using the provided keys.

            **8. Contributing**:
            Provide guidelines based on the detected contribution guide or suggest standard steps.

            **9. License**:
            State the project's license based on the analysis.

            ---
            **DEEP PROJECT ANALYSIS DETAILS (YOUR ONLY SOURCE OF TRUTH):**

            - **Style Guidance**: ${styleGuidance}
            - **Project Core Info**:
                - Name: ${repository.name}
                - Description: ${
                  repository.description || "No description provided."
                }
                - Main Language: ${mainLanguage}
                - Project Type: ${projectType}
                - Topics: ${repository.topics.join(", ") || "None"}
                - License: ${repository.license?.name || "Not specified"}

            ${userAnswersSection}

            - **Technology Stack**:
                - Frameworks & Core Tech: ${
                  frameworks.join(", ") || "None detected"
                }
                - Package Managers: ${
                  packageManagers.join(", ") || "None detected"
                }
                - Categorized Dependencies: ${JSON.stringify(
                  categorizedDependencies,
                  null,
                  2
                )}

            - **Development & Operations**:
                - Available Scripts: ${
                  Object.keys(scripts).join(", ") || "None"
                }
                - CI/CD Configuration: ${
                  cicdConfig
                    ? `${cicdConfig.platform} (${cicdConfig.configFile})`
                    : "None"
                }
                - Testing Configuration: ${
                  testConfig
                    ? `${
                        testConfig.framework
                      } with commands: ${testConfig.commands.join(", ")}`
                    : "None"
                }
                - Deployment Configuration: ${
                  deploymentConfig
                    ? `${
                        deploymentConfig.platform
                      } with files: ${deploymentConfig.configFiles.join(", ")}`
                    : "None"
                }

            - **Project Internals**:
                - Environment Variables Detected (${envVariables.length}):
                    ${
                      envVariables
                        .map(
                          (e) =>
                            `- ${e.key}${
                              e.defaultValue
                                ? ` (default: ${e.defaultValue})`
                                : ""
                            }`
                        )
                        .join("\n") || "None"
                    }
                - API Endpoints Detected (${apiEndpoints.length}):
                    ${
                      apiEndpoints
                        .map((ep) => `- ${ep.method} ${ep.path}`)
                        .join("\n") || "None"
                    }
                - Key Code Summaries:
                    ${
                      summarizedCodeSnippets
                        .map(
                          (s) =>
                            `File: ${s.fileName}\nSummary: ${s.summary}\n---`
                        )
                        .join("\n") || "No summaries available."
                    }

            - **Repository Structure**:
            \`\`\`
            ${fullFileTree}
            \`\`\`

            ---
            Generate ONLY the README.md content. Be factual, comprehensive, and adhere strictly to the analysis provided.
        `;
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
      const prompt = `
        Create a simple, modern, and professional SVG logo (64x64) for a project named "${
          analysis.repository.name
        }".

        **Guidelines**:
        1.  Use a solid background color.
        2.  Use the project's initials ("${analysis.repository.name
          .charAt(0)
          .toUpperCase()}") as the main element.
        3.  Use a clean, sans-serif font for the initial.
        4.  The color scheme should be modern and professional.

        Return only the SVG code, with no explanations.
      `;

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
    // DIPERBAIKI: Tambahkan pengecekan untuk memastikan codeSnippets adalah array
    if (!Array.isArray(codeSnippets)) {
      console.warn(
        "analyzeCodeSnippets received non-array input, returning empty array."
      );
      return [];
    }

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
    customBadges: Badge[],
    userAnswers?: Record<string, string>,
    logoUrl?: string // New optional parameter
  ): Promise<string> {
    try {
      const enhancedAnalysis = {
        ...analysis,
        summarizedCodeSnippets: await this.analyzeCodeSnippets(
          analysis.summarizedCodeSnippets || []
        ),
      };

      const prompt = this.createPrompt(
        enhancedAnalysis,
        template,
        language,
        customBadges,
        userAnswers,
        logoUrl // Pass logoUrl to createPrompt
      );

      console.log(
        `Starting AI generation with template: ${template} in ${language}`
      );

      let readmeContent = "";
      const input = {
        prompt: prompt,
        max_tokens: 20000, // Increased for comprehensive README
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
      console.log("--- RAW GENERATED README START ---");
      console.log(readmeContent.trim());
      console.log("--- RAW GENERATED README END ---");
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
