import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:8080/api';

// Sample code with issues to test
const testCases = [
  {
    name: "JavaScript with issues",
    language: "javascript",
    code: `
// This code has several issues
function calculateTotal(items) {
  let total = 0;
  
  // Missing loop variable
  for (i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  // Unused variable
  let tax = 0.1;
  
  // Unreachable code
  return total;
  console.log("Calculating total...");
}

// Using undefined variable
function processOrder(order) {
  return calculateTotal(orderItems);
}
`
  },
  {
    name: "Python with issues",
    language: "python",
    code: `
# This Python code has several issues
def calculate_average(numbers):
    # Division by zero risk
    return sum(numbers) / len(numbers)
    
    # Unreachable code
    print("Calculating average...")

# Using mutable default argument
def add_item(item, items=[]):
    items.append(item)
    return items

# Using undefined variable
def process_data(data):
    result = calculate_average(data)
    return transformed_data
`
  }
];

// Function to simulate a full PR workflow
async function simulatePullRequest(codeExample) {
  try {
    console.log(`\n🔍 Testing: ${codeExample.name}`);
    console.log("======================================");
    
    // Step 1: Analyze the code
    console.log("Step 1: Analyzing code...");
    const analysisResponse = await axios.post(`${API_BASE_URL}/analyze`, {
      code: codeExample.code,
      language: codeExample.language
    });
    
    console.log("Analysis Results:");
    console.log(JSON.stringify(analysisResponse.data, null, 2));
    
    // Step 2: If code has issues, fix it
    if (analysisResponse.data.suggestions && analysisResponse.data.suggestions.length > 0) {
      console.log("\nStep 2: Fixing code issues...");
      const fixResponse = await axios.post(`${API_BASE_URL}/fix`, {
        code: codeExample.code,
        language: codeExample.language,
        suggestions: analysisResponse.data.suggestions
      });
      
      console.log("Fixed Code:");
      console.log(fixResponse.data.fixedCode);
      
      // Step 3: Test the fixed code
      console.log("\nStep 3: Testing fixed code with AI...");
      const testResponse = await axios.post(`${API_BASE_URL}/testwithai`, {
        code: fixResponse.data.fixedCode,
        language: codeExample.language
      });
      
      console.log("Test Results:");
      console.log(JSON.stringify(testResponse.data, null, 2));
      
      // Step 4: In a real environment, this would create a PR
      console.log("\nStep 4: Simulating PR creation...");
      console.log("💡 In a real GitHub App deployment, this step would create a PR with the fixed code.");
      console.log("💡 For this simulation, we're skipping the actual GitHub API calls.");
      
      // Show what the PR would contain
      console.log("\n📋 The PR would contain:");
      console.log(`   - Title: Fix issues in ${codeExample.language} code`);
      console.log("   - Body: This PR fixes code issues identified by automated analysis.");
      console.log(`   - File: ${codeExample.language === "javascript" ? "app.js" : "app.py"}`);
      console.log("   - Fixed code: The improved code shown above");
      
    } else {
      console.log("No issues found, skipping fix step.");
    }
    
    console.log("\n✅ Test completed for", codeExample.name);
    console.log("======================================");
    
  } catch (error) {
    console.error("❌ Error during simulation:", error.message);
    if (error.response) {
      console.error("Response error data:", error.response.data);
    }
  }
}

// Run the simulation for all test cases
async function runTests() {
  console.log("🚀 Starting PR simulation tests");
  console.log("======================================");
  
  for (const testCase of testCases) {
    await simulatePullRequest(testCase);
  }
  
  console.log("🏁 All tests completed");
}

runTests(); 