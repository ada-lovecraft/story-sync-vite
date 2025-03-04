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

  // Calculate the padding length for the index based on total rounds
  const getPaddedIndex = (index: number) => {
    const magnitude = rounds.length.toString().length + 1
    return index.toString().padStart(magnitude, '0')
  }

  return (
    <ScrollArea className="h-[400px]">
      <Table>
        <TableHeader>
          <TableRow className="py-1">
            <TableHead colSpan={2} className="py-2 text-center">#</TableHead>
            <TableHead className="w-full py-2">Summary</TableHead>
            <TableHead className="w-48 text-center py-2">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {getChapterRounds().map((round) => {
            const isOmitted = isRoundOmitted(round.roundIndex)
            return (
              <TableRow 
                key={round.roundIndex} 
                className={cn(
                  "py-1",
                  isOmitted && "opacity-50 bg-muted/50"
                )}
              >
                <TableCell className="py-1 px-1">
                  <StatusBadge status={round.summaryStatus} />
                </TableCell>
                <TableCell className="font-mono text-xs font-extralight text-muted-foreground py-1 px-2">
                  {getPaddedIndex(round.roundIndex)}
                </TableCell>
                <TableCell className="max-w-md truncate text-left py-1 px-2 text-sm">
                  {round.summary || "No summary available"}
                </TableCell>
                <TableCell className="text-right py-1 px-2">
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