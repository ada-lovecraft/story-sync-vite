import { FC } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chapter, Round } from "@/store"
import { ChapterTable } from './ChapterTable'

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
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chapter {chapterIndex + 1}</CardTitle>
        <CardDescription>
          {chapter.summary 
            ? `Summary: ${chapter.summary}` 
            : `Rounds ${chapter.roundsRange[0]} to ${chapter.roundsRange[1]}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
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