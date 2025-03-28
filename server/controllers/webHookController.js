import axios from 'axios';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export const webHook = async (req, res) => {
    try {
        // Get the event type from the headers
        const githubEvent = req.headers['x-github-event'];
        const payload = req.body;
        
        console.log(`Received GitHub webhook: ${githubEvent}`);
        
        if (!githubEvent) {
            return res.status(400).json({ error: 'Missing X-GitHub-Event header' });
        }
        
        // Handle different event types
        switch (githubEvent) {
            case 'push':
                await handlePushEvent(payload);
                break;
            case 'pull_request':
                await handlePullRequestEvent(payload);
                break;
            case 'issues':
                await handleIssueEvent(payload);
                break;
            default:
                console.log(`Unhandled GitHub event: ${githubEvent}`);
        }
        
        // Return 200 OK to GitHub to acknowledge receipt
        return res.status(200).json({ message: 'Webhook received and processed' });
    } catch (error) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message || error 
        });
    }
};

// Handle push events (code was pushed to the repository)
const handlePushEvent = async (payload) => {
    try {
        const { repository, commits, ref } = payload;
        
        if (!repository || !commits || !ref) {
            console.error('Invalid push event payload');
            return;
        }
        
        // Only process pushes to the default branch
        const defaultBranch = `refs/heads/${repository.default_branch}`;
        if (ref !== defaultBranch) {
            console.log(`Ignoring push to non-default branch: ${ref}`);
            return;
        }
        
        // Get repository details
        const repoOwner = repository.owner.login || repository.owner.name;
        const repoName = repository.name;
        
        console.log(`Processing push to ${repoOwner}/${repoName}`);
        
        // Process each commit
        for (const commit of commits) {
            // Get the files that were modified or added
            const modifiedFiles = [...commit.added, ...commit.modified];
            
            // Process each file
            for (const filePath of modifiedFiles) {
                // Only process relevant code files
                if (isProcessableFile(filePath)) {
                    await processFile(repoOwner, repoName, filePath);
                }
            }
        }
    } catch (error) {
        console.error('Error handling push event:', error);
        throw error;
    }
};

// Handle pull request events
const handlePullRequestEvent = async (payload) => {
    try {
        const { action, pull_request, repository } = payload;
        
        if (!action || !pull_request || !repository) {
            console.error('Invalid pull request event payload');
            return;
        }
        
        // We're only interested in opened or synchronized PRs
        if (action !== 'opened' && action !== 'synchronize') {
            console.log(`Ignoring PR action: ${action}`);
            return;
        }
        
        const repoOwner = repository.owner.login || repository.owner.name;
        const repoName = repository.name;
        const prNumber = pull_request.number;
        
        console.log(`Processing PR #${prNumber} in ${repoOwner}/${repoName}`);
        
        // Get the files changed in the PR
        const changedFiles = await getFilesInPullRequest(repoOwner, repoName, prNumber);
        
        // Process each file
        for (const filePath of changedFiles) {
            if (isProcessableFile(filePath)) {
                await processFile(repoOwner, repoName, filePath, prNumber);
            }
        }
    } catch (error) {
        console.error('Error handling pull request event:', error);
        throw error;
    }
};

// Handle issue events
const handleIssueEvent = async (payload) => {
    try {
        const { action, issue, repository } = payload;
        
        if (!action || !issue || !repository) {
            console.error('Invalid issue event payload');
            return;
        }
        
        // Only process newly opened issues
        if (action !== 'opened') {
            console.log(`Ignoring issue action: ${action}`);
            return;
        }
        
        const repoOwner = repository.owner.login || repository.owner.name;
        const repoName = repository.name;
        const issueNumber = issue.number;
        const issueTitle = issue.title;
        const issueBody = issue.body;
        
        console.log(`Processing issue #${issueNumber} in ${repoOwner}/${repoName}`);
        
        // Check if this is a code review request
        if (issueTitle.toLowerCase().includes('code review') || issueBody.toLowerCase().includes('code review')) {
            // Extract code blocks from the issue body
            const codeBlocks = extractCodeBlocks(issueBody);
            
            if (codeBlocks.length > 0) {
                // Process the code blocks
                for (const { code, language } of codeBlocks) {
                    // Analyze the code
                    await analyzeCodeFromIssue(repoOwner, repoName, issueNumber, code, language);
                }
            }
        }
    } catch (error) {
        console.error('Error handling issue event:', error);
        throw error;
    }
};

// Helper function to check if a file should be processed
const isProcessableFile = (filePath) => {
    // Check file extension to determine if we should process it
    const supportedExtensions = ['.js', '.py', '.ts', '.jsx', '.tsx'];
    return supportedExtensions.some(ext => filePath.endsWith(ext));
};

// Helper function to get file content from GitHub
const getFileContent = async (owner, repo, path, ref = null) => {
    try {
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.APP_ID,
                privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: process.env.INSTALLATION_ID,
            },
        });
        
        const options = {
            owner,
            repo,
            path,
        };
        
        if (ref) {
            options.ref = ref;
        }
        
        const { data } = await octokit.repos.getContent(options);
        
        // Decode the content (GitHub returns base64 encoded content)
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        
        // Determine language based on file extension
        const fileExtension = path.split('.').pop().toLowerCase();
        let language;
        
        switch (fileExtension) {
            case 'js':
            case 'jsx':
                language = 'javascript';
                break;
            case 'ts':
            case 'tsx':
                language = 'typescript';
                break;
            case 'py':
                language = 'python';
                break;
            default:
                language = fileExtension;
        }
        
        return { content, language };
    } catch (error) {
        console.error(`Error getting file content for ${owner}/${repo}/${path}:`, error);
        throw error;
    }
};

// Get files changed in a pull request
const getFilesInPullRequest = async (owner, repo, pullNumber) => {
    try {
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.APP_ID,
                privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: process.env.INSTALLATION_ID,
            },
        });
        
        const { data } = await octokit.pulls.listFiles({
            owner,
            repo,
            pull_number: pullNumber,
        });
        
        return data.map(file => file.filename);
    } catch (error) {
        console.error(`Error getting files for PR #${pullNumber}:`, error);
        throw error;
    }
};

// Process a file: get its content, analyze it, and fix if needed
const processFile = async (owner, repo, path, prNumber = null) => {
    try {
        // Get file content
        const { content, language } = await getFileContent(owner, repo, path, prNumber ? `refs/pull/${prNumber}/head` : null);
        
        // Send the file for analysis
        const analysisResponse = await axios.post('http://localhost:3000/api/analyze', {
            code: content,
            language,
        });
        
        // If issues were found, fix the code and create a PR
        if (analysisResponse.data.status === 'fixed' && analysisResponse.data.fixedCode) {
            // Create a PR with the fixed code
            await axios.post('http://localhost:3000/api/push_pr', {
                fixedCode: analysisResponse.data.fixedCode,
                repoOwner: owner,
                repoName: repo,
                filePath: path,
                title: `Fix issues in ${path}`,
                body: `This PR fixes issues found in ${path} during automated code analysis.`,
            });
            
            console.log(`Created PR for fixed code in ${path}`);
        }
    } catch (error) {
        console.error(`Error processing file ${path}:`, error);
        throw error;
    }
};

// Analyze code from an issue
const analyzeCodeFromIssue = async (owner, repo, issueNumber, code, language) => {
    try {
        // Analyze the code
        const analysisResponse = await axios.post('http://localhost:3000/api/analyze', {
            code,
            language,
        });
        
        // Create a comment on the issue with the analysis results
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.APP_ID,
                privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: process.env.INSTALLATION_ID,
            },
        });
        
        let commentBody;
        
        if (analysisResponse.data.status === 'fixed' && analysisResponse.data.fixedCode) {
            commentBody = `
## Code Analysis Results

I found and fixed some issues in your code. Here's the improved version:

\`\`\`${language}
${analysisResponse.data.fixedCode}
\`\`\`

### Issues Fixed:
${analysisResponse.data.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}
`;
        } else {
            commentBody = `
## Code Analysis Results

${analysisResponse.data.message || 'Code analysis completed.'}

${analysisResponse.data.suggestions.length > 0 ? 
`### Suggestions:
${analysisResponse.data.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}` : 
'No issues found in the code!'}
`;
        }
        
        await octokit.issues.createComment({
            owner,
            repo,
            issue_number: issueNumber,
            body: commentBody,
        });
        
        console.log(`Added analysis comment to issue #${issueNumber}`);
    } catch (error) {
        console.error(`Error analyzing code from issue #${issueNumber}:`, error);
        throw error;
    }
};

// Helper function to extract code blocks from a markdown string
const extractCodeBlocks = (markdown) => {
    const codeBlockRegex = /```(\w+)?\s*([\s\S]*?)```/g;
    const codeBlocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(markdown)) !== null) {
        const language = match[1] || 'text';
        const code = match[2].trim();
        
        codeBlocks.push({ language, code });
    }
    
    return codeBlocks;
};
