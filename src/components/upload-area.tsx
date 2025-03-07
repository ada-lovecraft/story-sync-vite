import { FC, useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { UploadIcon } from "@radix-ui/react-icons"
import { useStore } from '@/store'
import { transformContent, parseContentIntoRounds, groupRoundsIntoChapters } from '@/utils/content-transformation'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface UploadAreaProps {
  onNext?: () => void;
}

export const UploadArea: FC<UploadAreaProps> = ({ onNext }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileStats, setFileStats] = useState<{
    fileSizeKB: number;
    lineCount: number;
    roundCount: number;
    chapterCount: number;
  } | null>(null)

  // Get store actions and state
  const {
    setRawFileContent,
    setProcessedContent,
    setRounds,
    setChapters,
    rawFileContent
  } = useStore()

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const uploadFile = async (file: File) => {
    if (!file) return

    // Check if file is a text file
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      toast.error('Please upload a text file')
      return
    }

    // Check file size (1-3MB)
    const fileSizeMB = file.size / (1024 * 1024)
    const fileSizeKB = Math.round(file.size / 1024)

    if (fileSizeMB < 1 || fileSizeMB > 3) {
      toast.warning(`File size should be between 1-3MB. Current size: ${fileSizeMB.toFixed(2)}MB`)
      // Still continue processing
    }

    try {
      setIsProcessing(true)

      // Read file content
      const rawContent = await file.text()

      // Calculate line count
      const lineCount = rawContent.split('\n').length

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

      // Set file stats
      setFileStats({
        fileSizeKB,
        lineCount,
        roundCount: rounds.length,
        chapterCount: chapters.length
      })

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
    uploadFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  const handleButtonClick = () => {
    // Trigger file input click
    fileInputRef.current?.click()
  }

  const handleNextClick = () => {
    if (!rawFileContent) {
      toast.error('No file content to process')
      return
    }

    // Use the onNext callback if provided
    if (onNext) {
      onNext()
    } else {
      // Fallback if no onNext prop
      toast.success('Proceeding to fine-tuning')
    }
  }

  const handleBackClick = () => {
    // Clear content from store to return to upload state
    setRawFileContent('')
    setProcessedContent('')
    setRounds([])
    setChapters([])
    setFileStats(null)
    toast.success('File deleted successfully')
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Upload Story</CardTitle>
        <CardDescription>
          Upload your story file to begin processing. Supported format: UTF-8 text files (1-3MB).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto flex flex-col space-y-4">
        {/* Always show the dropzone at the top */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${isDragging ? 'border-primary bg-secondary/50' : 'border-muted-foreground/25'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-semibold">Drag & Drop File</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            or click the button below to browse
          </p>
          <Button
            className="mt-2"
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

        {/* Show content preview below if rawFileContent exists */}
        {rawFileContent && (
          <div className="flex flex-col flex-1">
            <h3 className="text-lg font-semibold mb-2">File Content Preview</h3>
            <div className="flex-1 relative min-h-[200px]">
              <Textarea
                className="font-mono text-sm w-full absolute inset-0 resize-none overflow-auto"
                value={rawFileContent || ''}
                readOnly
              />
            </div>

            {/* File Stats Display */}
            {fileStats && (
              <div className="mt-4 bg-secondary/30 p-3 rounded-md">
                <h4 className="text-sm font-medium mb-2">File Statistics</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-background">
                    Size: {fileStats.fileSizeKB} KB
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Lines: {fileStats.lineCount}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Rounds: {fileStats.roundCount}
                  </Badge>
                  <Badge variant="outline" className="bg-background">
                    Chapters: {fileStats.chapterCount}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="mt-auto border-t flex items-center">
        {rawFileContent ? (
          <div className="flex justify-between w-full items-center">
            <Button
              variant="destructive"
              onClick={handleBackClick}
            >
              Delete
            </Button>
            <Button
              onClick={handleNextClick}
              disabled={isProcessing}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardFooter>
      <Toaster />
    </Card>
  )
} 