import express from "express";
import dotenv from "dotenv";
import webhookRoutes from "./routes/webhookRoute.js";
import apiRoutes from "./routes/apiRoutes.js";

// Load environment variables
dotenv.config();
console.log("Environment loaded");

// Create Express app
const app = express();
console.log("Express app created");

// Middleware
app.use(express.json()); 
console.log("JSON middleware configured");

// Add a test route for the root path
app.get("/", (req, res) => {
  res.send("Healer GitHub App is running!");
});
console.log("Root route added");

// Main routes
try {
  app.use("/webhook", webhookRoutes);
  console.log("Webhook routes mounted");
  
  app.use("/api", apiRoutes);
  console.log("API routes mounted");
} catch (error) {
  console.error("Error mounting routes:", error);
}

// Start server
const PORT = process.env.PORT || 3000;
try {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
} catch (error) {
  console.error("Error starting server:", error);
}
