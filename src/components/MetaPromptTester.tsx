import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { CopyableText } from './ui/copyable-text';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModelSelector } from './ModelSelector';

// Local storage keys
const META_PROMPTER_CONFIGS_KEY = 'metapromptConfigs';
const META_PROMPT_TESTER_RESPONSE_KEY = 'metaPromptTesterResponse';

// Available models
const AVAILABLE_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'gpt-4.5-preview'];

interface MetaPromptConfig {
  name: string;
  purpose: string;
  instructions: string[];
  sections: string[];
  examples: string;
  variables: string[];
  prompt?: string;
}

interface VariableFormData {
  [key: string]: string;
}

export function MetaPromptTester() {
  // State for all available configurations
  const [configs, setConfigs] = useState<MetaPromptConfig[]>([]);
  // Currently selected config
  const [selectedConfig, setSelectedConfig] = useState<MetaPromptConfig | null>(null);
  // Variable form values
  const [variableValues, setVariableValues] = useState<VariableFormData>({});
  // Selected model
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0]);
  // Response state
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load configs from localStorage on mount
  useEffect(() => {
    const savedConfigsData = localStorage.getItem(META_PROMPTER_CONFIGS_KEY);
    if (savedConfigsData) {
      try {
        const parsedConfigs = JSON.parse(savedConfigsData);
        if (Array.isArray(parsedConfigs)) {
          // Filter configs to ensure they have names and prompt text
          const validConfigs = parsedConfigs.filter(
            config => config && typeof config === 'object' && config.name && config.prompt
          );
          setConfigs(validConfigs);
          
          // Select the first config if available
          if (validConfigs.length > 0) {
            setSelectedConfig(validConfigs[0]);
            initializeVariableValues(validConfigs[0]);
          }
        }
      } catch (e) {
        console.error('Failed to parse saved configurations:', e);
      }
    }

    // Load saved response from localStorage
    const savedResponse = localStorage.getItem(META_PROMPT_TESTER_RESPONSE_KEY);
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

  // Initialize variable form values when a config is selected
  const initializeVariableValues = useCallback((config: MetaPromptConfig) => {
    if (!config.variables || !Array.isArray(config.variables)) return;
    
    const initialValues: VariableFormData = {};
    config.variables.forEach(variable => {
      initialValues[variable] = '';
    });
    
    setVariableValues(initialValues);
  }, []);

  // Handle config selection change
  const handleConfigChange = useCallback((configName: string) => {
    const config = configs.find(c => c.name === configName);
    if (config) {
      setSelectedConfig(config);
      initializeVariableValues(config);
      setResponse('');
      setError(null);
    }
  }, [configs, initializeVariableValues]);

  // Handle variable input changes
  const handleVariableChange = useCallback((variable: string, value: string) => {
    setVariableValues(prev => ({
      ...prev,
      [variable]: value
    }));
  }, []);

  // Process prompt by replacing variables with values
  const processPrompt = useCallback(() => {
    if (!selectedConfig?.prompt) return '';
    
    let processedPrompt = selectedConfig.prompt;
    
    Object.entries(variableValues).forEach(([variable, value]) => {
      const variablePattern = new RegExp(`\\[\\[${variable}\\]\\]`, 'g');
      processedPrompt = processedPrompt.replace(
        variablePattern, 
        `<![CDATA[\n${value}\n]]>`
      );
    });
    
    return processedPrompt;
  }, [selectedConfig, variableValues]);

  // Handle model change
  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    console.log(`Model changed to: ${modelId}`);
  }, []);

  // Submit the processed prompt
  const handleSubmit = async () => {
    if (!selectedConfig) {
      setError("No configuration selected");
      return;
    }

    // Check if all variables have values
    const emptyVariables = Object.entries(variableValues)
      .filter(([_, value]) => !value.trim())
      .map(([key]) => key);
    
    if (emptyVariables.length > 0) {
      setError(`Please fill in all variables: ${emptyVariables.join(', ')}`);
      return;
    }

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
      const processedPrompt = processPrompt();
      const response = await fetch('http://localhost:4000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: processedPrompt,
          model: selectedModel 
        }),
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
      localStorage.setItem(META_PROMPT_TESTER_RESPONSE_KEY, fullResponse);
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
        <CardTitle className="text-2xl font-bold">MetaPrompt Tester</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
        {/* Left Column - Input Form */}
        <Card className="flex flex-col h-full">
          <CardContent className="flex flex-col h-full p-4 overflow-y-auto">
            <div className="space-y-4 pb-4">
              {/* Select config */}
              <div>
                <Label htmlFor="configSelect" className="block text-sm font-medium mb-2">
                  Select Prompt Configuration
                </Label>
                {configs.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No saved configurations found. Create configurations in the MetaPrompter first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select 
                    value={selectedConfig?.name} 
                    onValueChange={handleConfigChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      {configs.map(config => (
                        <SelectItem key={config.name} value={config.name}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Variable inputs */}
              {selectedConfig && selectedConfig.variables && selectedConfig.variables.length > 0 ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <h3 className="font-medium">Variables</h3>
                  <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
                    {selectedConfig.variables.map((variable) => (
                      <div key={variable} className="flex flex-col h-[30vh]">
                        <Label htmlFor={`var-${variable}`} className="block text-sm font-medium mb-2">
                          {variable}
                        </Label>
                        <Textarea
                          id={`var-${variable}`}
                          placeholder={`Enter value for ${variable}...`}
                          value={variableValues[variable] || ''}
                          onChange={(e) => handleVariableChange(variable, e.target.value)}
                          className="flex-1 resize-none w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedConfig ? (
                <Alert>
                  <AlertDescription>
                    This configuration has no variables to fill.
                  </AlertDescription>
                </Alert>
              ) : null}
              
              {/* Separator and Model Selector */}
              <Separator className="my-4" />
              <div>
                <Label htmlFor="modelSelect" className="block text-sm font-medium mb-2">
                  Select AI Model
                </Label>
                <ModelSelector 
                  models={AVAILABLE_MODELS}
                  onModelChange={handleModelChange} 
                  defaultModel={AVAILABLE_MODELS[0]}
                  className="w-full" 
                />
              </div>
            </div>

            <Button
              className="mt-auto w-full"
              onClick={handleSubmit}
              disabled={isLoading || !selectedConfig || !selectedConfig.prompt}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Test Prompt'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column - Response */}
        <Card className="flex flex-col h-full">
          <CardContent className="flex flex-col h-full p-4">
            <div className="mb-2 font-medium">Generated Response</div>
            {error ? (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <CopyableText
                text={response}
                label="Response"
                variant="muted"
                maxHeight="calc(100vh - 280px)"
                copySuccessMessage="Response copied to clipboard!"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 