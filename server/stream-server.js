import express from 'express';
import { streamText } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
import cors from 'cors';

// Initialize the Express application
const app = express();
app.use(express.json());

// Add CORS middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Define the Zod schema for validation
const responseSchema = z.object({
    content: z.string(),
});

// Initialize OpenAI client - you'll need to provide your API key as an environment variable
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// POST endpoint for streaming (accepts prompt in request body)
app.post('/stream', async (req, res) => {
    const { prompt } = req.body;
    handleStreamRequest(req, res, prompt);
});

// GET endpoint for streaming (accepts prompt as query parameter)
app.get('/stream', async (req, res) => {
    const prompt = req.query.prompt;
    handleStreamRequest(req, res, prompt);
});

// Shared handler for stream requests
async function handleStreamRequest(req, res, prompt) {
    // Generate a unique ID for this request for logging
    const requestId = Math.random().toString(36).substring(2, 10);

    if (!prompt) {
        return res.status(400).send('Missing prompt parameter');
    }

    console.log(`[${requestId}] Stream request received with prompt: "${prompt}"`);

    try {
        console.log(`[${requestId}] Initializing stream with AI model`);
        // Using OpenAI for streaming
        const result = streamText({
            model: openai,
            prompt,
        });

        // Handle client disconnections
        let isClientConnected = true;
        req.on('close', () => {
            console.log(`[${requestId}] Client disconnected during stream`);
            console.log(`[${requestId}] Cleaning up resources after client disconnection`);
            isClientConnected = false;
            console.log(`[${requestId}] Client disconnected, stopping stream processing`);
        });

        console.log(`[${requestId}] Setting up SSE response headers`);
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });

        console.log(`[${requestId}] Starting to stream response chunks`);
        for await (const textPart of result.textStream) {
            // Check if client is still connected before sending
            if (!isClientConnected) {
                console.log(`[${requestId}] Not sending chunk - client already disconnected`);
                break;
            }

            try {
                const parsedData = responseSchema.parse({ content: textPart });
                res.write(`data: ${JSON.stringify(parsedData)}\n\n`);
            } catch (validationError) {
                console.error(`[${requestId}] Validation error:`, validationError);
            }
        }

        if (isClientConnected) {
            // Send an end event to notify the client
            res.write(`event: end\ndata: {}\n\n`);
            res.end();
            console.log(`[${requestId}] Stream completed successfully, response ended`);
        } else {
            console.log(`[${requestId}] Not ending response - client disconnected or response already ended`);
        }
    } catch (error) {
        console.error(`[${requestId}] Streaming error:`, error);
        if (!res.headersSent) {
            res.status(500).send('An error occurred during streaming.');
        }
    }
}

// Define the port number
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

// Start the server
app.listen(PORT, () => {
    console.log(`Stream server is running on port ${PORT}`);
}); 