import { OpenAI } from 'openai';
import { analyzeJavaScript } from "../middlewares/jsAnalyser.js";
import { analyzePython } from "../middlewares/pyAnalyser.js";

export const testWithAi = async (req, res) => {
    try {
        const { code, language } = req.body;
        
        if (!code || !language) {
            return res.status(400).json({ error: "Missing code or language field" });
        }
        
        // First, analyze the code for static errors
        let analysisResult;
        switch (language.toLowerCase()) {
            case "javascript":
            case "node":
                analysisResult = analyzeJavaScript(code);
                break;
            case "python":
                analysisResult = await analyzePython(code);
                break;
            default:
                return res.status(400).json({ error: "Unsupported language" });
        }
        
        // If there are static errors, return them immediately
        const filteredSuggestions = analysisResult.suggestions.filter(s => 
            !s.toLowerCase().includes("all good") && !s.startsWith("✅")
        );
        
        if (filteredSuggestions.length > 0) {
            return res.status(200).json({ 
                language,
                code,
                suggestions: filteredSuggestions,
                passed: false
            });
        }
        
        // No static errors found, now perform dynamic testing using AI
        const testResults = await runAiBasedTests(code, language);
        
        return res.status(200).json({
            language,
            code,
            suggestions: testResults.suggestions,
            passed: testResults.passed,
            testDetails: testResults.details
        });
    } catch (error) {
        console.error("Error in testWithAi:", error);
        return res.status(500).json({ error: "Internal server error", details: error.message || error });
    }
};

// Function to run AI-based tests on the code
const runAiBasedTests = async (code, language) => {
    try {
        const openAI = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Generate test cases using OpenAI
        const prompt = `
        You are a senior ${language} developer performing code review. 
        Your task is to test the following code for:
        1. Logic errors
        2. Edge cases
        3. Performance issues
        4. Security vulnerabilities
        
        Code:
        \`\`\`${language}
        ${code}
        \`\`\`
        
        Please generate 3-5 test cases that would check for these issues.
        For each test case, include:
        1. Input values
        2. Expected output
        3. Potential failure modes
        
        Then evaluate if the code will pass these tests. If not, explain why.
        Format your response as a JSON object with the following structure:
        {
            "passed": boolean,
            "suggestions": [array of suggestions as strings],
            "details": [array of test case details]
        }
        `;
        
        const response = await openAI.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "system",
                    content: "You are a code testing expert that generates and evaluates test cases."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" }
        });
        
        // Parse the response
        try {
            const jsonResponse = JSON.parse(response.choices[0].message.content);
            return {
                passed: jsonResponse.passed,
                suggestions: jsonResponse.suggestions || [],
                details: jsonResponse.details || []
            };
        } catch (parseError) {
            console.error("Error parsing JSON response from OpenAI:", parseError);
            return {
                passed: false,
                suggestions: ["⚠️ Error occurred while testing the code"],
                details: []
            };
        }
    } catch (error) {
        console.error("Error in AI testing:", error);
        return {
            passed: false,
            suggestions: ["⚠️ AI testing failed: " + (error.message || error)],
            details: []
        };
    }
};