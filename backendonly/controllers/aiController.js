const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const PDFParse = require('pdf-parse');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Chat with a document (PDF/Text)
// @route   POST /api/ai/chat
// @access  Private
const chatWithDocument = async (req, res) => {
    try {
        const { question } = req.body;
        const file = req.file;

        let contextText = "";

        if (file) {
            if (file.mimetype === 'application/pdf') {
                const dataBuffer = fs.readFileSync(file.path);
                const parser = new PDFParse({ data: dataBuffer });
                const data = await parser.getText();
                contextText = data.text;
            } else {
                // Assume text file
                contextText = fs.readFileSync(file.path, 'utf8');
            }

            // Cleanup: delete file after reading
            fs.unlinkSync(file.path);
        }

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"];
        let text = "";
        let success = false;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Attempting chat with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                let prompt = "";
                if (contextText) {
                    const maxLength = 20000;
                    if (contextText.length > maxLength) contextText = contextText.substring(0, maxLength) + "...[TRUNCATED]";
                    prompt = `Context: ${contextText}\n\nUser Question: ${question}\n\nAnswer the question based strictly on the context provided. If the answer is not in the context, say so.`;
                } else {
                    prompt = question;
                }

                const result = await model.generateContent(prompt);
                const response = await result.response;
                text = response.text();
                success = true;
                break; // Exit loop on success
            } catch (err) {
                lastError = err;
                if (err.status === 429 || (err.message && err.message.includes('429'))) {
                    console.log(`Model ${modelName} rate limited (429). Retrying with next model in 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
                    continue; // Try next model
                } else {
                    throw err; // Re-throw other errors
                }
            }
        }

        if (!success) {
            throw lastError || new Error("All models failed");
        }

        res.json({ answer: text });

    } catch (error) {
        console.error('AI Chat Error Full:', error);
        if (error.response) console.error('AI Chat Response Error:', error.response);
        res.status(500).json({ message: 'Error processing your request', error: error.message, details: error.toString() });
    }
};

// @desc    Generate a Quiz
// @route   POST /api/ai/quiz
// @access  Private
const generateQuiz = async (req, res) => {
    try {
        const { topic, difficulty = "Medium", count = 5 } = req.body;
        const file = req.file;

        let promptContext = "";

        if (file) {
            // Extract text from file
            if (file.mimetype === 'application/pdf') {
                const dataBuffer = fs.readFileSync(file.path);
                const parser = new PDFParse({ data: dataBuffer });
                const data = await parser.getText();
                promptContext = `Content: ${data.text.substring(0, 20000)}...`; // Limit context
            } else {
                promptContext = `Content: ${fs.readFileSync(file.path, 'utf8')}`;
            }
            // Cleanup
            fs.unlinkSync(file.path);
        } else {
            promptContext = `Topic: "${topic}"`;
        }

        const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"];
        let text = "";
        let success = false;
        let lastError = null;

        for (const modelName of modelsToTry) {
            try {
                // console.log(`Attempting quiz gen with model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const prompt = `Generate a quiz with ${count} multiple-choice questions based on the following ${promptContext}. Difficulty: ${difficulty}. 
                Return ONLY a raw JSON array (no markdown formatting, no code blocks) with the following structure:
                [
                    {
                        "question": "Question text",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "correctAnswer": 0 // Index of correct option (0-3)
                    }
                ]`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                text = response.text();
                success = true;
                break;
            } catch (err) {
                lastError = err;
                if (err.status === 429 || (err.message && err.message.includes('429'))) {
                    console.log(`Model ${modelName} rate limited (429). Retrying with next model in 2s...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                } else {
                    throw err;
                }
            }
        }

        if (!success) throw lastError;

        console.log("Gemini Response:", text); // Log the raw response

        // Cleanup markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const quiz = JSON.parse(text);

        res.json({ quiz });

    } catch (error) {
        console.error('AI Quiz Error Full:', error);
        res.status(500).json({ message: 'Error generating quiz', error: error.message, details: error.toString() });
    }
};

module.exports = { chatWithDocument, generateQuiz };
