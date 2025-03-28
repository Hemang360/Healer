import { Probot } from "probot";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read private key from file
let privateKey;
try {
  privateKey = fs.readFileSync(path.join(__dirname, "privateKey.pem"), "utf8").trim();
} catch (error) {
  // If file doesn't exist, try to use the environment variable
  console.warn("Private key file not found, using environment variable instead");
  privateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, "\n");
}

if (!privateKey) {
  console.error("No private key found. Please provide a privateKey.pem file or set the PRIVATE_KEY environment variable.");
  process.exit(1);
}

if (!process.env.APP_ID) {
  console.error("No APP_ID found. Please set the APP_ID environment variable.");
  process.exit(1);
}

// Initialize Probot
export const probot = new Probot({
  appId: Number(process.env.APP_ID),
  privateKey,
  secret: process.env.WEBHOOK_SECRET,
});

// Configure app events
probot.webhooks.on(["push"], async (context) => {
  const { owner, repo } = context.repo();
  const payload = context.payload;
  
  console.log(`📡 Push event received for ${owner}/${repo}`);
  console.log(`Ref: ${payload.ref}, Commits: ${payload.commits?.length || 0}`);
  
  // The actual processing happens in the webhook controller
  // This is just for logging and monitoring
});

probot.webhooks.on(["pull_request"], async (context) => {
  const { owner, repo } = context.repo();
  const payload = context.payload;
  
  console.log(`📡 Pull request event received for ${owner}/${repo}`);
  console.log(`Action: ${payload.action}, PR #${payload.pull_request?.number}`);
  
  // The actual processing happens in the webhook controller
});

probot.webhooks.on(["issues"], async (context) => {
  const { owner, repo } = context.repo();
  const payload = context.payload;
  
  console.log(`📡 Issue event received for ${owner}/${repo}`);
  console.log(`Action: ${payload.action}, Issue #${payload.issue?.number}`);
  
  // The actual processing happens in the webhook controller
});

console.log("Probot configuration loaded successfully");
