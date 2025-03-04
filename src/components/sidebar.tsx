import { FC } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileIcon, 
  GearIcon, 
  ReaderIcon, 
  DownloadIcon, 
  UploadIcon,
  ChatBubbleIcon
} from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export const Sidebar: FC = () => {
  return (
    <div className="h-full border-r">
      <ScrollArea className="h-full">
        <div className="space-y-4 py-4">
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold">Tools</h2>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start">
                <FileIcon className="mr-2 h-4 w-4" />
                Files
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <GearIcon className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="px-4 py-2">
            <h2 className="mb-2 px-2 text-lg font-semibold">Actions</h2>
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start">
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Story
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <ReaderIcon className="mr-2 h-4 w-4" />
                View Chapters
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <ChatBubbleIcon className="mr-2 h-4 w-4" />
                Summarize Rounds
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export Configuration
              </Button>
            </div>
          </div>
          
          <Separator />
          
          <div className="px-4 py-2">
            <div className="rounded-md bg-secondary p-3">
              <h3 className="font-medium">Need help?</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Check the documentation for guidance on using Story Sync.
              </p>
              <Button variant="default" size="sm" className="w-full">
                View Docs
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 