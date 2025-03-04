import { FC } from 'react'
import { Button } from "@/components/ui/button"
import { DownloadIcon } from "@radix-ui/react-icons"
import { useStore } from "@/store"
import { toast } from "sonner"
import { ChapterCard } from './ChapterCard'

export const FineTuningView: FC = () => {
  const { 
    chapters, 
    rounds, 
    slideRoundUp, 
    slideRoundDown, 
    splitChapter, 
    omitRound, 
    rerollRoundSummary,
    roundSummaryQueue
  } = useStore()

  // Handle cases when there's no data yet
  if (chapters.length === 0 || rounds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-semibold mb-4">No chapters available</h2>
        <p className="text-muted-foreground">Upload a file first to generate chapters.</p>
      </div>
    )
  }

  // Generate JSON configuration
  const exportConfig = () => {
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

  // Handle chapter actions
  const handleSlideUp = (chapterIndex: number, roundIndex: number) => {
    if (chapterIndex > 0) {
      slideRoundUp(chapterIndex, roundIndex)
      toast.success(`Round ${roundIndex} moved to previous chapter`)
    }
  }

  const handleSlideDown = (chapterIndex: number, roundIndex: number) => {
    if (chapterIndex < chapters.length - 1) {
      slideRoundDown(chapterIndex, roundIndex)
      toast.success(`Round ${roundIndex} moved to next chapter`)
    }
  }

  const handleSplit = (chapterIndex: number, roundIndex: number) => {
    splitChapter(chapterIndex, roundIndex)
    toast.success(`Chapter split at round ${roundIndex}`)
  }

  const handleOmit = (chapterIndex: number, roundIndex: number, currentOmitted: boolean) => {
    omitRound(chapterIndex, roundIndex, !currentOmitted)
    toast.success(`Round ${roundIndex} ${!currentOmitted ? 'omitted' : 'included'}`)
  }

  const handleReroll = (roundIndex: number) => {
    rerollRoundSummary(roundIndex)
    toast.success(`Round ${roundIndex} added to summarization queue`)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {chapters.map((chapter, chapterIndex) => (
          <div key={chapterIndex} className="mb-6">
            <ChapterCard
              chapter={chapter}
              chapterIndex={chapterIndex}
              rounds={rounds}
              isFirstChapter={chapterIndex === 0}
              isLastChapter={chapterIndex === chapters.length - 1}
              onSlideUp={handleSlideUp}
              onSlideDown={handleSlideDown}
              onSplit={handleSplit}
              onOmit={handleOmit}
              onReroll={handleReroll}
              roundSummaryQueue={roundSummaryQueue}
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          className="mr-2"
          onClick={exportConfig}
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          Download Configuration
        </Button>
      </div>
    </div>
  )
} 