console.log("Starting test server");

// Try requiring express
try {
  const express = require('express');
  console.log("Express imported successfully");
  
  // Create a simple express app
  const app = express();
  console.log("Express app created");
  
  // Add a simple route
  app.get('/', (req, res) => {
    res.send('Test server is working!');
  });
  
  // Start the server
  const PORT = 3333;
  app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Error setting up test server:", error);
} 