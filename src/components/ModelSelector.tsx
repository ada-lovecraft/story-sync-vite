import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ModelSelectorProps {
  /**
   * Array of model IDs to display in the selector
   */
  models: string[]
  
  /**
   * Callback function triggered when the model selection changes
   * @param modelId The ID of the selected model
   */
  onModelChange: (modelId: string) => void
  
  /**
   * Optional default selected model
   */
  defaultModel?: string
  
  /**
   * Optional CSS class name
   */
  className?: string
}

/**
 * A select component for choosing AI models
 */
export function ModelSelector({
  models,
  onModelChange,
  defaultModel,
  className = '',
}: ModelSelectorProps) {
  const [selectedModel, setSelectedModel] = useState(
    defaultModel && models.includes(defaultModel) 
      ? defaultModel 
      : models[0] || ''
  )

  function handleModelChange(modelId: string) {
    setSelectedModel(modelId)
    onModelChange(modelId)
  }

  return (
    <Select
      value={selectedModel}
      onValueChange={handleModelChange}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        {models.map(modelId => (
          <SelectItem key={modelId} value={modelId}>
            {modelId}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 