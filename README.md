

<h1 align="center">ReadmeGen AI</h1>

<p align="center">🚀 A smart web tool for automatic README.md generation using IBM Granite AI</p>

<p align="center">Transform your GitHub repositories with AI-generated, professional README files in seconds. Built with Next.js, TypeScript, and powered by IBM Granite AI through the Replicate API.</p>

<div align="center">

</div>

📖 Table of Contents
--------------------

-   [✨ Features](https://www.google.com/search?q=%23-features)

-   [🛠️ Tech Stack](https://www.google.com/search?q=%23-tech-stack)

-   [🚀 Getting Started](https://www.google.com/search?q=%23-getting-started)

-   [🎯 How It Works](https://www.google.com/search?q=%23-how-it-works)

-   [📁 Project Structure](https://www.google.com/search?q=%23-project-structure)

-   [🔧 Configuration](https://www.google.com/search?q=%23-configuration)

-   [🤝 Contributing](https://www.google.com/search?q=%23-contributing)

-   [📝 License](https://www.google.com/search?q=%23-license)

✨ Features
----------

-   🎯 **Deep Repository Analysis**: Automatically detects programming languages, frameworks, dependencies, project structure, CI/CD pipelines, testing configurations, and deployment settings.

-   🤖 **AI-Powered Content Generation**: Utilizes IBM Granite AI via the Replicate API to create comprehensive and professional documentation.

-   🤔 **Interactive Mode**: The AI can ask clarifying questions to gather more context and generate a higher-quality README.

-   👀 **Real-time Preview**: Instantly preview the rendered markdown output or view the raw source code.

-   CUSTOMIZATION **Customization**: Easily add custom badges and a logo URL to personalize your README.

-   📜 **Generation History**: Authenticated users can access and view their previously generated READMEs.

-   💻 **Modern Tech Stack**: Built with Next.js 14, React 19, TypeScript, and styled with Tailwind CSS.

🛠️ Tech Stack
--------------

-   **Frontend**: [Next.js](https://nextjs.org/) 14, [React](https://react.dev/) 19, [TypeScript](https://www.typescriptlang.org/)

-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)

-   **AI Model**: IBM Granite (`ibm-granite/granite-3.3-8b-instruct`) via [Replicate API](https://replicate.com/)

-   **APIs**: [GitHub API](https://docs.github.com/en/rest) for repository analysis

-   **Authentication**: [NextAuth.js](https://next-auth.js.org/)

-   **Database**: [Vercel KV](https://vercel.com/storage/kv) for storing generation history

-   **Deployment**: [Vercel](https://vercel.com/)

🚀 Getting Started
------------------

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   Node.js (v18.0.0 or higher)

-   npm, yarn, or pnpm

### Installation

1.  **Clone the repository**:

    Bash

    ```
    git clone https://github.com/eveeze/readmegen-ai.git
    cd readmegen-ai

    ```

2.  **Install dependencies**:

    Bash

    ```
    npm install

    ```

3.  **Set up environment variables**:

    Create a `.env.local` file in the root of your project and add the following variables:

    Cuplikan kode

    ```
    # Replicate API Token
    REPLICATE_API_TOKEN=your_replicate_api_token_here

    # GitHub OAuth App Credentials
    GITHUB_ID=your_github_oauth_app_client_id
    GITHUB_SECRET=your_github_oauth_app_client_secret

    # Optional: GitHub API Token for higher rate limits
    GITHUB_TOKEN=your_github_personal_access_token

    # NextAuth Configuration
    NEXTAUTH_URL=http://localhost:3000
    NEXTAUTH_SECRET=a_random_secret_string_for_session_encryption

    # Vercel KV Storage (for history feature)
    KV_URL=your_vercel_kv_storage_url
    KV_REST_API_URL=your_vercel_kv_rest_api_url
    KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
    KV_REST_API_READ_ONLY_TOKEN=your_vercel_kv_rest_api_read_only_token

    ```

4.  **Run the development server**:

    Bash

    ```
    npm run dev

    ```

5.  **Open your browser** and navigate to [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).

🎯 How It Works
---------------

1.  **Input**: The user provides a public GitHub repository URL.

2.  **Analysis**: The backend analyzes the repository using the GitHub API to understand its structure, detect technologies, and identify configurations.

3.  **AI Interaction (Optional)**: If interactive mode is enabled, the AI generates clarifying questions for the user to provide more context.

4.  **AI Generation**: The analysis data (and user answers) are sent to the IBM Granite AI model to generate a comprehensive README.

5.  **Output & Preview**: The generated README is displayed in both rendered markdown and raw source formats for the user to review and copy.

📁 Project Structure
--------------------

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── auth/
│   │   ├── generate/
│   │   └── user-repos/
│   ├── history/              # Generation history page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── components/
│   ├── ui/                   # Reusable UI components
│   └── ...                   # Other components
├── lib/
│   ├── ai.ts                 # AI integration (IBM Granite)
│   ├── github.ts             # GitHub API client
│   └── utils.ts              # Utility functions
└── types/
    └── index.ts              # TypeScript type definitions

```

🔧 Configuration
----------------

The following environment variables are required for the application to function correctly. See the [Installation](https://www.google.com/search?q=%23installation) section for instructions on how to set them up.

| Variable                      | Description                                                | Required |
| ----------------------------- | ---------------------------------------------------------- | -------- |
| `REPLICATE_API_TOKEN`         | Your Replicate API token for the IBM Granite AI model.     | **Yes**  |
| `GITHUB_ID`                   | Your GitHub OAuth application client ID.                   | **Yes**  |
| `GITHUB_SECRET`               | Your GitHub OAuth application client secret.               | **Yes**  |
| `GITHUB_TOKEN`                | A GitHub personal access token for higher API rate limits. | No       |
| `NEXTAUTH_URL`                | The canonical URL of your Next.js application.             | **Yes**  |
| `NEXTAUTH_SECRET`             | A secret used to sign and encrypt session data.            | **Yes**  |
| `KV_URL`                      | Your Vercel KV storage URL.                                | **Yes**  |
| `KV_REST_API_URL`             | Your Vercel KV REST API URL.                               | **Yes**  |
| `KV_REST_API_TOKEN`           | Your Vercel KV REST API token.                             | **Yes**  |
| `KV_REST_API_READ_ONLY_TOKEN` | Your Vercel KV REST API read-only token.                   | **Yes**  |

🤝 Contributing
---------------

Contributions are welcome! Please follow these steps to contribute:

1.  **Fork the repository**

2.  **Create a feature branch**:

    Bash

    ```
    git checkout -b feature/amazing-feature

    ```

3.  **Make your changes**

4.  **Commit your changes**:

    Bash

    ```
    git commit -m 'Add some amazing feature'

    ```

5.  **Push to the branch**:

    Bash

    ```
    git push origin feature/amazing-feature

    ```

6.  **Open a Pull Request**

📝 License
----------

This project is licensed under the MIT License - see the [LICENSE](https://www.google.com/search?q=https://github.com/eveeze/readmegen-ai/blob/main/LICENSE) file for details.