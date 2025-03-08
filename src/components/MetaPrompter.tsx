import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Plus, Minus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code } from '@/components/ui/code';
import { metaprompt } from '@/data/metaprompt';

// Local storage key
const META_PROMPTER_KEY = 'metaPrompterData';
const META_PROMPTER_RESPONSE_KEY = 'metaPrompterResponse';

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

// Tag Input Component
interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder: string;
    disabled?: boolean;
}

function TagInput({ value, onChange, placeholder, disabled = false }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            if (!value.includes(inputValue.trim())) {
                onChange([...value, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        onChange(value.filter(t => t !== tag));
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {value.map(tag => (
                    <Badge key={tag} className="flex items-center gap-1 px-3 py-1">
                        {tag}
                        <button 
                            type="button" 
                            className="ml-1 text-xs" 
                            onClick={() => handleRemoveTag(tag)}
                            disabled={disabled}
                        >
                            ×
                        </button>
                    </Badge>
                ))}
            </div>
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full"
            />
        </div>
    );
}

// Form data interface
interface MetaPrompterFormData {
    purpose: string;
    instructions: string[];
    sections: string[];
    examples: string;
    variables: string[];
}

export function MetaPrompter() {
    // Form state
    const [formData, setFormData] = useState<MetaPrompterFormData>({
        purpose: '',
        instructions: [''],
        sections: [],
        examples: '',
        variables: []
    });

    // Response state
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const responseEndRef = useRef<HTMLDivElement>(null);

    // Debounce form changes
    const debouncedFormData = useDebounce(formData, 500);

    // Save form data to localStorage when it changes (debounced)
    useEffect(() => {
        localStorage.setItem(META_PROMPTER_KEY, JSON.stringify(debouncedFormData));
    }, [debouncedFormData]);

    // Load form data from localStorage on mount
    useEffect(() => {
        const savedFormData = localStorage.getItem(META_PROMPTER_KEY);
        if (savedFormData) {
            try {
                setFormData(JSON.parse(savedFormData));
            } catch (e) {
                console.error('Failed to parse saved form data:', e);
            }
        }

        // Load saved response from localStorage
        const savedResponse = localStorage.getItem(META_PROMPTER_RESPONSE_KEY);
        if (savedResponse) {
            setResponse(savedResponse);
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

    // Format form data for submission
    const formatPrompt = useCallback(() => {
        const userInput = `Purpose: ${formData.purpose}, Instructions: ${formData.instructions.join('\n    ')}, Sections: ${formData.sections.join(', ')}, Examples: ${formData.examples}, Variables: ${formData.variables.join(', ')}`;
        const prompt = metaprompt.replace('{{user-input}}', userInput);
        return prompt;
    }, [formData]);

    // Submit form
    const handleSubmit = async () => {
        if (!formData.purpose.trim() || formData.instructions.some(i => !i.trim())) return;

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
            const prompt = formatPrompt();
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
            let fullResponse = '';

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const text = decoder.decode(value, { stream: !done });
                    fullResponse += text;
                    setResponse(fullResponse);
                }
            }

            // Store the complete response in localStorage
            localStorage.setItem(META_PROMPTER_RESPONSE_KEY, fullResponse);
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

    // Handle purpose change
    const handlePurposeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, purpose: e.target.value }));
    }, []);

    // Handle instruction changes
    const handleInstructionChange = useCallback((index: number, value: string) => {
        setFormData(prev => {
            const newInstructions = [...prev.instructions];
            newInstructions[index] = value;
            return { ...prev, instructions: newInstructions };
        });
    }, []);

    // Add new instruction
    const handleAddInstruction = useCallback(() => {
        setFormData(prev => ({
            ...prev,
            instructions: [...prev.instructions, '']
        }));
    }, []);

    // Remove instruction
    const handleRemoveInstruction = useCallback((index: number) => {
        setFormData(prev => {
            if (prev.instructions.length <= 1) return prev;
            
            const newInstructions = [...prev.instructions];
            newInstructions.splice(index, 1);
            return { ...prev, instructions: newInstructions };
        });
    }, []);

    // Handle sections change
    const handleSectionsChange = useCallback((sections: string[]) => {
        setFormData(prev => ({ ...prev, sections }));
    }, []);

    // Handle examples change
    const handleExamplesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, examples: e.target.value }));
    }, []);

    // Handle variables change
    const handleVariablesChange = useCallback((variables: string[]) => {
        setFormData(prev => ({ ...prev, variables }));
    }, []);

    return (
        <div className="w-full flex flex-col space-y-4">
            <CardHeader className="px-0">
                <CardTitle className="text-2xl font-bold">Meta Prompter</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
                {/* Left Column - Input Form */}
                <Card className="flex flex-col h-full">
                    <CardContent className="flex flex-col h-full p-4 overflow-y-auto">
                        <div className="space-y-4 pb-4">
                            {/* Purpose */}
                            <div>
                                <Label htmlFor="purpose" className="block text-sm font-medium mb-2">
                                    Purpose
                                </Label>
                                <Textarea
                                    id="purpose"
                                    placeholder="Enter the purpose of the prompt..."
                                    value={formData.purpose}
                                    onChange={handlePurposeChange}
                                    disabled={isLoading}
                                    className="min-h-[80px] resize-y"
                                />
                            </div>

                            {/* Instructions */}
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Instructions
                                </Label>
                                <div className="space-y-2">
                                    {formData.instructions.map((instruction, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder={`Instruction ${index + 1}`}
                                                value={instruction}
                                                onChange={(e) => handleInstructionChange(index, e.target.value)}
                                                disabled={isLoading}
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => handleRemoveInstruction(index)}
                                                disabled={isLoading || formData.instructions.length <= 1}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAddInstruction}
                                        disabled={isLoading}
                                        className="mt-2"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Instruction
                                    </Button>
                                </div>
                            </div>

                            {/* Sections */}
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Sections
                                </Label>
                                <TagInput
                                    value={formData.sections}
                                    onChange={handleSectionsChange}
                                    placeholder="Enter section name and press Enter..."
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Examples */}
                            <div>
                                <Label htmlFor="examples" className="block text-sm font-medium mb-2">
                                    Examples
                                </Label>
                                <Textarea
                                    id="examples"
                                    placeholder="Enter examples here..."
                                    className="w-full min-h-[100px] resize-y"
                                    value={formData.examples}
                                    onChange={handleExamplesChange}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Variables */}
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Variables
                                </Label>
                                <TagInput
                                    value={formData.variables}
                                    onChange={handleVariablesChange}
                                    placeholder="Enter variable name and press Enter..."
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Form Data Code View */}
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Form Data Preview
                                </Label>
                                <Code
                                    language="json"
                                    code={JSON.stringify(formData, null, 2)}
                                    showLineNumbers={true}
                                    className="max-h-60 overflow-auto text-xs"
                                />
                            </div>
                        </div>

                        <Button
                            className="mt-auto w-full"
                            onClick={handleSubmit}
                            disabled={isLoading || !formData.purpose.trim() || formData.instructions.some(i => !i.trim())}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                'Generate Prompt'
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right Column - Response */}
                <Card className="flex flex-col h-full">
                    <CardContent className="flex flex-col h-full p-4">
                        <div className="mb-2 font-medium">Generated Prompt</div>
                        {error ? (
                            <Alert variant="destructive" className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="whitespace-pre-wrap overflow-auto flex-1 h-[calc(100%-2rem)] border rounded-md p-3">
                                {response || (isLoading ? 'Generating prompt...' : 'Submit the form to generate a prompt.')}
                                <div ref={responseEndRef} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 