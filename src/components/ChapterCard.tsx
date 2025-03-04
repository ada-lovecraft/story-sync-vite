import { FC } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Chapter, Round, SummaryQueueItem } from "@/store"
import { ChapterTable } from './ChapterTable'
import { ChapterHeader } from './ChapterHeader'

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
}) => {
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
        />
      </CardContent>
    </Card>
  )
} 