# Healer - GitHub App for Automated Code Analysis and Fixing

This GitHub App automatically analyzes code in repositories, identifies issues, and creates pull requests with fixes. It can also analyze code snippets posted in issues.

## Features

- **Automated Code Analysis**: Detects syntax errors, bugs, and best practice violations
- **AI-Powered Code Fixing**: Uses AI to generate fixes for identified issues
- **Test-Driven Verification**: Tests fixed code to ensure it actually works
- **Pull Request Generation**: Creates PRs with fixes when issues are found
- **Multiple Language Support**: Currently supports JavaScript and Python
- **GitHub Webhook Integration**: Listens to push, pull request, and issue events

## How It Works

1. **Event Listening**: The app listens for GitHub events (push, PR, issues)
2. **Code Analysis**: When new code is pushed or PR'd, it analyzes the code for issues
3. **Issue Detection**: If issues are found, the app identifies specific problems
4. **AI-Powered Fixing**: The app uses OpenAI to generate fixes for the issues
5. **Testing**: Fixed code is tested to ensure it works properly
6. **Pull Request**: If fixes improve the code, a PR is automatically created

## Setup

### Prerequisites

- Node.js (v14+)
- npm
- GitHub Account
- OpenAI API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd server
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   cp .env.example .env
   ```

### GitHub App Configuration

1. [Create a GitHub App](https://github.com/settings/apps/new) with the following permissions:
   - Repository contents: Read & write
   - Pull requests: Read & write
   - Issues: Read & write
   - Webhooks: Read & write

2. Generate a private key for your GitHub App and either:
   - Save it as `privateKey.pem` in the server directory, or
   - Add it to your `.env` file as `PRIVATE_KEY`

3. Install the GitHub App on repositories you want to monitor

### Environment Variables

Configure the following environment variables in your `.env` file:

- `APP_ID`: Your GitHub App ID
- `PRIVATE_KEY`: Your GitHub App's private key (if not using privateKey.pem)
- `INSTALLATION_ID`: The installation ID of your GitHub App
- `WEBHOOK_SECRET`: A secret string for webhook verification
- `OPENAI_API_KEY`: Your OpenAI API key

## Usage

### Starting the Server

```
npm start
```

For development with auto-restart:
```
npm run dev
```

### Manual Testing

You can manually test the code analysis and fixing using the test script:

```
npm test
```

## API Endpoints

- `POST /api/analyze`: Analyze code for issues
- `POST /api/fix`: Fix issues in code
- `POST /api/testwithai`: Test code using AI
- `POST /api/push_pr`: Create a PR with fixed code
- `POST /webhook`: Webhook endpoint for GitHub events

## Extending the App

### Adding Language Support

To add support for a new language:
1. Create a new analyzer in the `middlewares` directory
2. Update the language detection in the controllers

### Customizing Analysis Rules

Modify the analyzer files in the `middlewares` directory to customize rules.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 