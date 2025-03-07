import express from 'express';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import cors from 'cors';
const app = express();
app.use(express.json());
// Enable CORS for all routes and origins
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.post('/generate', async (req, res) => {
    const { prompt } = req.body;
    const result = streamText({
        model: openai('gpt-4o'),
        prompt,
    });
    result.pipeTextStreamToResponse(res);
});
app.listen(4000, () => {
    console.log('Server is harmonizing on port 4000.');
});
