import { FC, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadIcon } from "@radix-ui/react-icons"

export const UploadArea: FC = () => {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // File processing will be implemented in Section 4
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
          <Button className="mt-4">
            Select File
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          File should contain conversation history between user and AI
        </p>
      </CardFooter>
    </Card>
  )
} 