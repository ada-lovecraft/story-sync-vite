import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Local storage key
const TOOL_PROMPT_KEY = 'toolPrompt';

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function ToolsView() {
    const [prompt, setPrompt] = useState<string>('');
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const responseEndRef = useRef<HTMLDivElement>(null);

    // Debounce prompt changes
    const debouncedPrompt = useDebounce(prompt, 500);

    // Save prompt to localStorage when it changes (debounced)
    useEffect(() => {
        if (debouncedPrompt) {
            localStorage.setItem(TOOL_PROMPT_KEY, debouncedPrompt);
        }
    }, [debouncedPrompt]);

    // Load prompt from localStorage on mount
    useEffect(() => {
        const savedPrompt = localStorage.getItem(TOOL_PROMPT_KEY);
        if (savedPrompt) {
            setPrompt(savedPrompt);
        }
    }, []);

    // Auto-scroll to bottom of response when it updates
    useEffect(() => {
        if (responseEndRef.current) {
            responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [response]);

    // Clean up any pending fetch on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPrompt(e.target.value);
    }, []);

    const handleSubmit = async () => {
        if (!prompt.trim()) return;

        // Reset states
        setIsLoading(true);
        setResponse('');
        setError(null);

        // Abort any existing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new AbortController
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('http://localhost:4000/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
                signal: abortController.signal
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Failed to get response stream reader');
            }

            const decoder = new TextDecoder();
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const text = decoder.decode(value, { stream: !done });
                    setResponse(prev => prev + text);
                }
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Request aborted');
                return;
            }

            console.error('Error:', error);
            setError(error instanceof Error ? error.message : 'An error occurred while fetching the response.');
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <div className="w-full flex flex-col space-y-4">
            <CardHeader className="px-0">
                <CardTitle className="text-2xl font-bold">Tools</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
                {/* Left Column - Input */}
                <Card className="flex flex-col h-full">
                    <CardContent className="flex flex-col h-full p-4">
                        <div className="flex-1">
                            <label htmlFor="prompt" className="block text-sm font-medium mb-2">
                                Prompt
                            </label>
                            <Textarea
                                id="prompt"
                                placeholder="Enter your prompt here..."
                                className="w-full h-[calc(100%-50px)] resize-none"
                                value={prompt}
                                onChange={handlePromptChange}
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            className="mt-4 w-full"
                            onClick={handleSubmit}
                            disabled={isLoading || !prompt.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Submit'
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Column - Response */}
                <Card className="h-full">
                    <CardContent className="h-full p-4 overflow-auto">
                        <div className="mb-2 font-medium">Response</div>
                        {error ? (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="whitespace-pre-wrap">
                                {response || (isLoading ? 'Waiting for response...' : 'Submit a prompt to see the response here.')}
                                <div ref={responseEndRef} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 