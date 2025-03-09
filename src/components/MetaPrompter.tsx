import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle, Plus, Minus, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Code } from '@/components/ui/code';
import { metaprompt } from '@/data/metaprompt';
import { CopyableText } from './ui/copyable-text';

// Local storage keys
const META_PROMPTER_RESPONSE_KEY = 'metaPrompterResponse';
const META_PROMPTER_CONFIGS_KEY = 'metapromptConfigs';
const LAST_META_CONFIG_KEY = 'lastMetaConfig';

// Tag Input Component
interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder: string;
    disabled?: boolean;
}

function TagInput({ value = [], onChange, placeholder, disabled = false }: TagInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            const newValue = Array.isArray(value) ? value : [];
            if (!newValue.includes(inputValue.trim())) {
                onChange([...newValue, inputValue.trim()]);
            }
            setInputValue('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        const newValue = Array.isArray(value) ? value : [];
        onChange(newValue.filter(t => t !== tag));
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {Array.isArray(value) && value.map(tag => (
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
    name: string;
    purpose: string;
    instructions: string[];
    sections: string[];
    examples: string;
    variables: string[];
    prompt?: string; // The generated prompt text
}

export function MetaPrompter() {
    // Form state
    const [formData, setFormData] = useState<MetaPrompterFormData>({
        name: '',
        purpose: '',
        instructions: [''],
        sections: [],
        examples: '',
        variables: []
    });

    // Saved configurations
    const [savedConfigs, setSavedConfigs] = useState<MetaPrompterFormData[]>([]);
    
    // Filter/search term for saved configurations
    const [configFilter, setConfigFilter] = useState('');
    
    // Response state
    const [response, setResponse] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    

    // Load form data and saved configurations from localStorage on mount
    useEffect(() => {
        // Load saved configurations first, since we'll need them to select the last used one
        let loadedConfigs: MetaPrompterFormData[] = [];
        const savedConfigsData = localStorage.getItem(META_PROMPTER_CONFIGS_KEY);
        
        if (savedConfigsData) {
            try {
                const parsedConfigs = JSON.parse(savedConfigsData);
                if (Array.isArray(parsedConfigs)) {
                    // Ensure all configs have names
                    loadedConfigs = parsedConfigs.filter(config => 
                        config && typeof config === 'object' && config.name
                    );
                    setSavedConfigs(loadedConfigs);
                }
            } catch (e) {
                console.error('Failed to parse saved configurations:', e);
                loadedConfigs = [];
            }
        }
        
        // Check for last used config
        const lastUsedConfigName = localStorage.getItem(LAST_META_CONFIG_KEY);
        let configToLoad: MetaPrompterFormData | null = null;
        
        if (lastUsedConfigName && loadedConfigs.length > 0) {
            // Try to find the last used config
            configToLoad = loadedConfigs.find(config => config.name === lastUsedConfigName) || null;
        }
        
        // If no last config was found or available, use the first saved config
        if (!configToLoad && loadedConfigs.length > 0) {
            configToLoad = loadedConfigs[0];
        }
        
        // Load the selected config or fallback to current form data
        if (configToLoad) {
            // Make a deep copy and ensure all required fields exist
            const configCopy = JSON.parse(JSON.stringify(configToLoad));
            setFormData({
                name: configCopy.name || '',
                purpose: configCopy.purpose || '',
                instructions: Array.isArray(configCopy.instructions) ? configCopy.instructions : [''],
                sections: Array.isArray(configCopy.sections) ? configCopy.sections : [],
                examples: configCopy.examples || '',
                variables: Array.isArray(configCopy.variables) ? configCopy.variables : [],
                prompt: configCopy.prompt || '',
            });
            console.log(`Loaded configuration: ${configCopy.name}`);
        }

        // Load saved response from localStorage
        const savedResponse = localStorage.getItem(META_PROMPTER_RESPONSE_KEY);
        if (savedResponse) {
            setResponse(savedResponse);
        }
    }, []);

    

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
        // Ensure we have arrays, even if they're empty
        const sections = Array.isArray(formData.sections) ? formData.sections : [];
        const variables = Array.isArray(formData.variables) ? formData.variables : [];
        const instructions = Array.isArray(formData.instructions) ? formData.instructions : [''];
        
        const userInput = `Purpose: ${formData.purpose}, Instructions: ${instructions.join('\n    ')}, Sections: ${sections.join(', ')}, Examples: ${formData.examples}, Variables: ${variables.join(', ')}`;
        const prompt = metaprompt.replace('{{user-input}}', userInput);
        return prompt;
    }, [formData]);

    // Save current configuration
    const saveConfiguration = useCallback(() => {
        if (!formData.name.trim()) return;
        
        console.log('Saving configuration with sections:', formData.sections);
        console.log('Saving configuration with variables:', formData.variables);
        
        // Create new array of configs, replacing any with the same name
        const newConfigs = savedConfigs.filter(config => config.name !== formData.name);
        newConfigs.push({ 
            ...formData,
            // Ensure arrays are properly copied
            sections: [...formData.sections],
            variables: [...formData.variables]
        });
        
        // Update state and local storage
        setSavedConfigs(newConfigs);
        localStorage.setItem(META_PROMPTER_CONFIGS_KEY, JSON.stringify(newConfigs));
        
        // Also save this as the last used config
        localStorage.setItem(LAST_META_CONFIG_KEY, formData.name);
        
        // Optionally show a success message or provide user feedback
        console.log(`Configuration "${formData.name}" saved successfully`);
    }, [formData, savedConfigs]);

    // Load a saved configuration
    const loadConfiguration = useCallback((configName: string) => {
        const config = savedConfigs.find(c => c.name === configName);
        if (config) {
            // Make a deep copy to avoid reference issues
            const configCopy = JSON.parse(JSON.stringify(config));
            
            console.log('Loading config with sections before:', configCopy.sections);
            console.log('Loading config with variables before:', configCopy.variables);
            
            // Check if sections and variables are undefined or null and provide defaults
            if (!configCopy.sections) configCopy.sections = [];
            if (!configCopy.variables) configCopy.variables = [];
            
            // Ensure sections and variables are arrays
            if (!Array.isArray(configCopy.sections)) configCopy.sections = [];
            if (!Array.isArray(configCopy.variables)) configCopy.variables = [];
            
            console.log('Loading config with sections after:', configCopy.sections);
            console.log('Loading config with variables after:', configCopy.variables);
            
            // Ensure the configuration has the required fields
            setFormData({
                name: configCopy.name || '',
                purpose: configCopy.purpose || '',
                instructions: Array.isArray(configCopy.instructions) ? configCopy.instructions : [''],
                sections: configCopy.sections,
                examples: configCopy.examples || '',
                variables: configCopy.variables,
                prompt: configCopy.prompt || '',
            });
            
            // If the config has a saved prompt, display it
            if (configCopy.prompt) {
                setResponse(configCopy.prompt);
            }
            
            // Clear the filter
            setConfigFilter('');
            
            // Optionally provide user feedback
            console.log(`Configuration "${configName}" loaded successfully`);
        }
    }, [savedConfigs]);

    // Filter saved configurations
    const filteredConfigs = useMemo(() => {
        if (!configFilter) return savedConfigs;
        const lowerFilter = configFilter.toLowerCase();
        return savedConfigs.filter(config => 
            config.name.toLowerCase().includes(lowerFilter)
        );
    }, [savedConfigs, configFilter]);

    // Submit form
    const handleSubmit = async () => {
        // Check for required fields including name
        if (!formData.name.trim() || !formData.purpose.trim() || formData.instructions.some(i => !i.trim())) {
            setError("Prompt Name, Purpose, and at least one Instruction are required.");
            return;
        }

        // Save the current config name as the last used config
        localStorage.setItem(LAST_META_CONFIG_KEY, formData.name);

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
            
            // Update the form data with the generated prompt
            const updatedFormData = {
                ...formData,
                prompt: fullResponse,
                // Ensure arrays are properly copied
                sections: [...formData.sections],
                variables: [...formData.variables]
            };
            console.log('Saving after generation with sections:', updatedFormData.sections);
            console.log('Saving after generation with variables:', updatedFormData.variables);
            setFormData(updatedFormData);
            
            // Save the configuration to localStorage
            const newConfigs = savedConfigs.filter(config => config.name !== updatedFormData.name);
            newConfigs.push(updatedFormData);
            setSavedConfigs(newConfigs);
            localStorage.setItem(META_PROMPTER_CONFIGS_KEY, JSON.stringify(newConfigs));
            
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

    // Handle prompt name change
    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, name: e.target.value }));
    }, []);

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
        console.log('Sections changed:', sections);
        setFormData(prev => ({ ...prev, sections }));
    }, []);

    // Handle examples change
    const handleExamplesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, examples: e.target.value }));
    }, []);

    // Handle variables change
    const handleVariablesChange = useCallback((variables: string[]) => {
        console.log('Variables changed:', variables);
        setFormData(prev => ({ ...prev, variables }));
    }, []);

    // Ensure configurations are saved when component unmounts
    useEffect(() => {
        return () => {
            // Save the configurations one last time before unmount
            if (savedConfigs.length > 0) {
                localStorage.setItem(META_PROMPTER_CONFIGS_KEY, JSON.stringify(savedConfigs));
            }
        };
    }, [savedConfigs]);

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
                            {/* Prompt Name */}
                            <div>
                                <Label htmlFor="promptName" className="block text-sm font-medium mb-2">
                                    Prompt Name <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-grow">
                                        <Input
                                            id="promptName"
                                            placeholder="Enter a name for this prompt configuration..."
                                            value={formData.name}
                                            onChange={handleNameChange}
                                            disabled={isLoading}
                                            className={`w-full pr-8 ${!formData.name.trim() && 'border-red-300 focus-visible:ring-red-200'}`}
                                            list="saved-prompts"
                                            required
                                        />
                                        {savedConfigs.length > 0 && (
                                            <div className="absolute inset-y-0 right-2 flex items-center">
                                                <button
                                                    type="button"
                                                    className="text-gray-400 hover:text-gray-600"
                                                    onClick={() => setConfigFilter(formData.name)}
                                                >
                                                    ▼
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={saveConfiguration}
                                        disabled={isLoading || !formData.name.trim()}
                                    >
                                        Save
                                    </Button>
                                </div>
                                
                                {!formData.name.trim() && (
                                    <p className="mt-1 text-sm text-red-500">Prompt name is required</p>
                                )}
                                
                                {configFilter && (
                                    <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                                        {filteredConfigs.length === 0 ? (
                                            <div className="p-2 text-sm text-gray-500">No saved prompts found</div>
                                        ) : (
                                            <ul className="py-1">
                                                {filteredConfigs.map((config) => (
                                                    <li 
                                                        key={config.name}
                                                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                        onClick={() => loadConfiguration(config.name)}
                                                    >
                                                        {config.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Purpose */}
                            <div>
                                <Label htmlFor="purpose" className="block text-sm font-medium mb-2">
                                    Purpose <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="purpose"
                                    placeholder="Enter the purpose of the prompt..."
                                    value={formData.purpose}
                                    onChange={handlePurposeChange}
                                    disabled={isLoading}
                                    className={`min-h-[80px] resize-y ${!formData.purpose.trim() && 'border-red-300 focus-visible:ring-red-200'}`}
                                    required
                                />
                                {!formData.purpose.trim() && (
                                    <p className="mt-1 text-sm text-red-500">Purpose is required</p>
                                )}
                            </div>

                            {/* Instructions */}
                            <div>
                                <Label className="block text-sm font-medium mb-2">
                                    Instructions <span className="text-red-500">*</span>
                                </Label>
                                <div className="space-y-2">
                                    {formData.instructions.map((instruction, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                placeholder={`Instruction ${index + 1}`}
                                                value={instruction}
                                                onChange={(e) => handleInstructionChange(index, e.target.value)}
                                                disabled={isLoading}
                                                className={`${!instruction.trim() && index === 0 && 'border-red-300 focus-visible:ring-red-200'}`}
                                                required={index === 0}
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
                                    
                                    {formData.instructions.length > 0 && !formData.instructions[0].trim() && (
                                        <p className="mt-1 text-sm text-red-500">At least one instruction is required</p>
                                    )}
                                    
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
                            disabled={isLoading || !formData.name.trim() || !formData.purpose.trim() || formData.instructions.some(i => !i.trim())}
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
                            <CopyableText
                                text={response}
                                label="Generated Prompt"
                                icon={<FileText className="h-4 w-4" />}
                                variant="muted"
                                copySuccessMessage="Prompt copied to clipboard!"
                            />
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 