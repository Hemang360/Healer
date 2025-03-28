import { OpenAI } from 'openai';
import axios from 'axios';

export const fixCode = async (req, res) => {
    try {
        const { code, language, suggestions } = req.body;

        if (!code || !language || !suggestions) {
            return res.status(400).json({ error: "Missing required fields: code, language, or suggestions" });
        }

        // Call the actual fix function
        const fixedCode = await performCodeFix(language, code, suggestions);
        
        return res.status(200).json({ 
            status: "success", 
            fixedCode,
            message: "Code fixed successfully"
        });
    } catch (error) {
        console.error("Error fixing code:", error);
        return res.status(500).json({ 
            error: "Failed to fix code", 
            details: error.message || error 
        });
    }
};

// Function that performs the actual code fixing
const performCodeFix = async (language, code, suggestions) => {
    try {
        // Construct a prompt for OpenAI that will fix the entire code based on suggestions
        const prompt = `
      You are a skilled ${language} developer. Your task is to fix the following code based on the issues described below:
      
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`

      Issues and Suggestions:
      ${suggestions.map(s => `- ${s}`).join("\n")}

      Please apply the fixes and return the full corrected code.
      Only return the fixed code without explanations or markdown formatting.
    `;

        const openAI = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY, // Get API key from environment variable
        });

        // Send the prompt to OpenAI
        const response = await openAI.chat.completions.create({
            model: "gpt-4", // You can use any GPT model like GPT-3.5 or GPT-4
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that helps improve code."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
        });

        const fixedCode = response.choices[0].message.content.trim();

        // Recursive improvement: Test the fixed code
        try {
            const testResponse = await axios.post('http://localhost:3000/api/testwithai', {
                language: language,
                code: fixedCode
            });

            // If the test found issues, try to fix them recursively
            // But limit recursion to avoid infinite loops
            if (!testResponse.data.passed && testResponse.data.suggestions && testResponse.data.suggestions.length > 0) {
                console.log("First fix had issues, attempting second iteration...");
                
                // Add a recursion counter in the suggestions to limit recursion depth
                const recursiveDepth = suggestions.find(s => s.startsWith("RECURSION_DEPTH:"));
                const depth = recursiveDepth ? parseInt(recursiveDepth.split(":")[1]) : 0;
                
                if (depth < 3) {  // Limit to 3 iterations
                    const newSuggestions = [
                        ...testResponse.data.suggestions,
                        `RECURSION_DEPTH:${depth + 1}`
                    ];
                    
                    return await performCodeFix(language, fixedCode, newSuggestions);
                } else {
                    console.log("Max recursion depth reached, returning current fixed code");
                    return fixedCode;
                }
            }
            
            return fixedCode;
        } catch (testError) {
            console.error("Error testing fixed code:", testError);
            return fixedCode; // Return the fixed code even if testing fails
        }
    }
    catch (error) {
        console.error("Error fixing the code:", error);
        throw error;
    }
};
