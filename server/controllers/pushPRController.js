import axios from 'axios';
import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export const pushPR = async (req, res) => {
    try {
        const { fixedCode, repoOwner, repoName, filePath, branchName, title, body } = req.body;

        // Ensure necessary data is provided
        if (!fixedCode || !repoOwner || !repoName || !filePath) {
            return res.status(400).json({ 
                error: 'Missing required fields', 
                details: 'Please provide: fixedCode, repoOwner, repoName, and filePath' 
            });
        }

        // Use default values or provided values for optional fields
        const prBranchName = branchName || `fix-${Date.now()}`;
        const prTitle = title || `Fix: Automated code improvements`;
        const prBody = body || `This PR contains automated fixes for code issues identified by our system.`;

        try {
            // Create a PR with the fixed code
            const prResult = await createPullRequest(
                repoOwner, 
                repoName, 
                filePath, 
                fixedCode, 
                prBranchName, 
                prTitle, 
                prBody
            );

            return res.status(200).json({ 
                message: 'PR created successfully', 
                pr: prResult 
            });
        } catch (prError) {
            console.error('Error creating PR:', prError);
            return res.status(500).json({ 
                error: 'Failed to create PR', 
                details: prError.message || prError 
            });
        }
    } catch (error) {
        console.error('Error in pushPR controller:', error);
        return res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message || error 
        });
    }
};

// Function to create a GitHub pull request with fixed code
const createPullRequest = async (owner, repo, path, content, branchName, title, body) => {
    try {
        // Initialize Octokit with GitHub App credentials
        const octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
                appId: process.env.APP_ID,
                privateKey: process.env.PRIVATE_KEY?.replace(/\\n/g, '\n'),
                installationId: process.env.INSTALLATION_ID,
            },
        });

        // 1. Get the default branch (usually main or master)
        const { data: repoData } = await octokit.repos.get({
            owner,
            repo,
        });
        const defaultBranch = repoData.default_branch;

        // 2. Get the latest commit SHA from the default branch
        const { data: refData } = await octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
        });
        const latestCommitSha = refData.object.sha;

        // 3. Create a new branch based on the default branch
        await octokit.git.createRef({
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: latestCommitSha,
        });

        // 4. Get the current file content to get its SHA
        let currentFileSha;
        try {
            const { data: fileData } = await octokit.repos.getContent({
                owner,
                repo,
                path,
                ref: defaultBranch,
            });
            currentFileSha = fileData.sha;
        } catch (error) {
            // File might not exist yet
            console.log('File does not exist yet, creating new file');
        }

        // 5. Create or update file in the new branch
        const { data: commitData } = await octokit.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: `Fix: Automated code improvements`,
            content: Buffer.from(content).toString('base64'),
            branch: branchName,
            sha: currentFileSha,
        });

        // 6. Create a pull request
        const { data: prData } = await octokit.pulls.create({
            owner,
            repo,
            title,
            body,
            head: branchName,
            base: defaultBranch,
        });

        return {
            pullRequestUrl: prData.html_url,
            pullRequestNumber: prData.number,
        };
    } catch (error) {
        console.error('Error in createPullRequest:', error);
        throw error;
    }
};
