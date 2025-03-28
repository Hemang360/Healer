console.log("Hello, world!");

// Try a synchronous operation
try {
  const os = require('os');
  console.log("OS platform:", os.platform());
  console.log("OS type:", os.type());
} catch (error) {
  console.error("Error:", error);
}

// Just sleep for a bit and exit
setTimeout(() => {
  console.log("Exiting after 3 seconds");
  process.exit(0);
}, 3000); 