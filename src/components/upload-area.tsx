import { FC, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadIcon } from "@radix-ui/react-icons"
import { useStore } from '@/store'
import { transformContent, parseContentIntoRounds, groupRoundsIntoChapters } from '@/utils/content-transformation'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

export const UploadArea: FC = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get store actions
  const { setRawFileContent, setProcessedContent, setRounds, setChapters } = useStore()
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const processFile = async (file: File) => {
    if (!file) return
    
    // Check if file is a text file
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast.error('Please upload a text file')
      return
    }
    
    // Check file size (1-3MB)
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB < 1 || fileSizeMB > 3) {
      toast.warning(`File size should be between 1-3MB. Current size: ${fileSizeMB.toFixed(2)}MB`)
      // Still continue processing
    }
    
    try {
      setIsProcessing(true)
      
      // Read file content
      const rawContent = await file.text()
      
      // Store raw content in Zustand
      setRawFileContent(rawContent)
      
      // Transform content according to requirements
      const processedContent = transformContent(rawContent)
      
      // Store processed content in Zustand
      setProcessedContent(processedContent)
      
      // Parse content into rounds
      const rounds = parseContentIntoRounds(processedContent)
      
      // Store rounds in Zustand
      setRounds(rounds)
      
      // Group rounds into chapters
      const chapters = groupRoundsIntoChapters(rounds)
      
      // Store chapters in Zustand
      setChapters(chapters)
      
      toast.success(`File processed successfully: ${rounds.length} rounds, ${chapters.length} chapters`)
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error('Error processing file. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    processFile(file)
  }
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }
  
  const handleButtonClick = () => {
    // Trigger file input click
    fileInputRef.current?.click()
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Upload Story</CardTitle>
        <CardDescription>
          Upload your story file to begin processing. Supported format: UTF-8 text files (1-3MB).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className={`border-2 border-dashed rounded-lg p-12 text-center ${
            isDragging ? 'border-primary bg-secondary/50' : 'border-muted-foreground/25'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Drag & Drop File</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            or click the button below to browse
          </p>
          <Button 
            className="mt-4"
            onClick={handleButtonClick}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Select File'}
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".txt,text/plain" 
            onChange={handleFileInputChange}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          File should contain conversation history between user and AI
        </p>
      </CardFooter>
      <Toaster />
    </Card>
  )
} 