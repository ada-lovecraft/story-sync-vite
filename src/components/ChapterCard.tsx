import { FC } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Chapter, Round, SummaryQueueItem } from "@/store"
import { ChapterTable } from './ChapterTable'
import { ChapterHeader } from './ChapterHeader'
import { toast } from "sonner"
// Import optimized selectors and actions
import { useQueueActions, useChapterRounds } from '@/store/selectors'

interface ChapterCardProps {
  chapter: Chapter
  chapterIndex: number
  rounds: Round[]
  isLastChapter: boolean
  isFirstChapter: boolean
  onSlideUp: (chapterIndex: number, roundIndex: number) => void
  onSlideDown: (chapterIndex: number, roundIndex: number) => void
  onSplit: (chapterIndex: number, roundIndex: number) => void
  onOmit: (chapterIndex: number, roundIndex: number, currentOmitted: boolean) => void
  onReroll: (roundIndex: number) => void
  roundSummaryQueue?: SummaryQueueItem[]
  allChapters?: Chapter[]
}

export const ChapterCard: FC<ChapterCardProps> = ({
  chapter,
  chapterIndex,
  rounds,
  isFirstChapter,
  isLastChapter,
  onSlideUp,
  onSlideDown,
  onSplit,
  onOmit,
  onReroll,
  roundSummaryQueue = [],
  allChapters = []
}) => {
  // Use optimized queue actions instead of direct store access
  const { enqueueRoundSummary, processRoundSummaryQueue } = useQueueActions()
  
  // Use the optimized chapter rounds selector if we're not using the passed rounds
  // const chapterRounds = useChapterRounds(chapterIndex)
  // Note: We're still using the passed rounds prop for now to maintain compatibility

  const summarizeAllRounds = async () => {
    // Get rounds in this chapter
    const chapterRounds = rounds.filter(round => 
      round.roundIndex >= chapter.roundsRange[0] && 
      round.roundIndex <= chapter.roundsRange[1]
    )
    
    // Filter out omitted rounds
    const eligibleRounds = chapterRounds.filter(round => 
      !chapter.omit.includes(round.roundIndex)
    )
    
    // Add each eligible round to the queue
    eligibleRounds.forEach(round => {
      enqueueRoundSummary(round.roundIndex)
    })
    
    // Start processing the queue
    processRoundSummaryQueue()
    
    // Show confirmation toast
    toast.success(`Added ${eligibleRounds.length} rounds to the summarization queue`)
  }

  return (
    <Card>
      <ChapterHeader
        chapter={chapter}
        chapterIndex={chapterIndex}
        rounds={rounds}
        roundSummaryQueue={roundSummaryQueue}
      />
      <CardContent className="pt-2 px-2">
        <ChapterTable
          chapter={chapter}
          chapterIndex={chapterIndex}
          rounds={rounds}
          isFirstChapter={isFirstChapter}
          isLastChapter={isLastChapter}
          onSlideUp={onSlideUp}
          onSlideDown={onSlideDown}
          onSplit={onSplit}
          onOmit={onOmit}
          onReroll={onReroll}
          allChapters={allChapters}
        />
      </CardContent>
    </Card>
  )
} 