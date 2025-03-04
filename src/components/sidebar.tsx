import { FC, useState } from 'react'
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileIcon, 
  GearIcon, 
  ReaderIcon, 
  DownloadIcon, 
  UploadIcon,
  ChatBubbleIcon,
  DashboardIcon
} from "@radix-ui/react-icons"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { StateViewDrawer } from './StateViewDrawer'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface SidebarProps {
  onNavigation?: (view: 'upload' | 'fine-tuning' | 'summary') => void
}

export const Sidebar: FC<SidebarProps> = ({ onNavigation }) => {
  const [stateViewOpen, setStateViewOpen] = useState(false);
  const { chapters, rounds, roundSummaryQueue } = useStore();
  
  // Handle navigation
  const navigateTo = (view: 'upload' | 'fine-tuning' | 'summary') => {
    if (onNavigation) {
      onNavigation(view);
    }
  }
  
  // Export configuration (reusing the same logic from FineTuningView)
  const exportConfig = () => {
    if (chapters.length === 0) {
      toast.error("No chapters available to export");
      return;
    }
    
    const config = {
      chapters: chapters.map(chapter => ({
        rounds: chapter.roundsRange,
        omit: chapter.omit
      }))
    }
    
    // Create and download the JSON file
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = 'chapter-config.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success("Configuration downloaded successfully")
  }
  
  const hasSummaryItems = roundSummaryQueue.length > 0;
  const hasRoundsAndChapters = rounds.length > 0 && chapters.length > 0;
  
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
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => navigateTo('upload')}
              >
                <UploadIcon className="mr-2 h-4 w-4" />
                Upload Story
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn("w-full justify-start", !hasRoundsAndChapters && "opacity-50")}
                onClick={() => hasRoundsAndChapters ? navigateTo('fine-tuning') : toast.error("Upload a file first to generate chapters")}
                disabled={!hasRoundsAndChapters}
              >
                <ReaderIcon className="mr-2 h-4 w-4" />
                Fine-tune Chapters
                {hasRoundsAndChapters && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs py-0.5 px-1.5 rounded-full">
                    {chapters.length}
                  </span>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn("w-full justify-start", !hasRoundsAndChapters && "opacity-50")}
                onClick={() => hasRoundsAndChapters ? navigateTo('summary') : toast.error("Upload a file first to generate chapters")}
                disabled={!hasRoundsAndChapters}
              >
                <ChatBubbleIcon className="mr-2 h-4 w-4" />
                Summarize Rounds
                {hasSummaryItems && (
                  <span className="ml-auto bg-primary/10 text-primary text-xs py-0.5 px-1.5 rounded-full">
                    {roundSummaryQueue.length}
                  </span>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                className={cn("w-full justify-start", !hasRoundsAndChapters && "opacity-50")}
                onClick={hasRoundsAndChapters ? exportConfig : () => toast.error("No chapters available to export")}
                disabled={!hasRoundsAndChapters}
              >
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export Configuration
              </Button>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => setStateViewOpen(true)}
              >
                <DashboardIcon className="mr-2 h-4 w-4" />
                View Store State
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
      
      <StateViewDrawer open={stateViewOpen} onOpenChange={setStateViewOpen} />
    </div>
  )
} 