import { FC } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Chapter, Round } from "@/store"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RoundActionsToolbar } from './RoundActionsToolbar'
import { StatusBadge } from './StatusBadge'

interface ChapterTableProps {
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

export const ChapterTable: FC<ChapterTableProps> = ({
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
  // Get rounds for a specific chapter
  const getChapterRounds = () => {
    const [start, end] = chapter.roundsRange
    return rounds.filter(round => 
      round.roundIndex >= start && 
      round.roundIndex <= end
    )
  }

  // Check if a round is omitted in a chapter
  const isRoundOmitted = (roundIndex: number) => {
    return chapter.omit.includes(roundIndex)
  }

  return (
    <ScrollArea className="h-[60vh]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Index</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-full">Summary</TableHead>
            <TableHead className="w-48 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getChapterRounds().map((round) => {
            const isOmitted = isRoundOmitted(round.roundIndex)
            return (
              <TableRow 
                key={round.roundIndex} 
                className={cn(
                  isOmitted && "opacity-50 bg-muted/50"
                )}
              >
                <TableCell>{round.roundIndex}</TableCell>
                <TableCell>
                  <StatusBadge status={round.summaryStatus} />
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {round.summary || "No summary available"}
                </TableCell>
                <TableCell className="text-right">
                  <RoundActionsToolbar
                    size="xs"
                    roundIndex={round.roundIndex}
                    chapterIndex={chapterIndex}
                    isFirstChapter={isFirstChapter}
                    isLastChapter={isLastChapter}
                    isOmitted={isOmitted}
                    onSlideUp={onSlideUp}
                    onSlideDown={onSlideDown}
                    onSplit={onSplit}
                    onOmit={onOmit}
                    onReroll={onReroll}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </ScrollArea>
  )
} 