import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { streamText } from 'ai';
import { z } from 'zod';
import OpenAI from 'openai';
// Initialize the Express application
const app = express();
app.use(express.json());
// Define the proxy middleware
const apiProxy = createProxyMiddleware({
    target: 'http://example.com/api', // Replace with your target API
    changeOrigin: true,
    selfHandleResponse: true, // Allows handling of the proxy response
    on: {
        proxyRes: (proxyRes, req, res) => {
            proxyRes.pipe(res);
        }
    }
});
// Apply the proxy middleware
app.use('/api', apiProxy);
const responseSchema = z.object({
    content: z.string(),
    // Add other fields as necessary
});
// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
// Create the streaming route with client disconnection handling
app.post('/stream', async (req, res) => {
    const { prompt } = req.body;
    try {
        // Using any as a workaround for type compatibility issues
        const result = streamText({
            model: openai,
            prompt,
        });
        // Handle client disconnections
        let isClientConnected = true;
        req.on('close', () => {
            console.log('Client disconnected');
            isClientConnected = false;
            // No need to call result.destroy() as it doesn't exist
        });
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
        });
        for await (const textPart of result.textStream) {
            // Check if client is still connected before sending
            if (!isClientConnected)
                break;
            try {
                const parsedData = responseSchema.parse({ content: textPart });
                res.write(`data: ${JSON.stringify(parsedData)}\n\n`);
            }
            catch (validationError) {
                console.error('Validation error:', validationError);
            }
        }
        if (isClientConnected) {
            res.end();
        }
    }
    catch (error) {
        console.error('Streaming error:', error);
        res.status(500).send('An error occurred during streaming.');
    }
});
// Define the port number
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
