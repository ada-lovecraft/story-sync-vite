import { FC, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Chapter, Round } from "@/store"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RoundActionsToolbar } from './RoundActionsToolbar'
import { StatusBadge } from './StatusBadge'
import { RoundDetailsDrawer } from './RoundDetailsDrawer'
import { useStore } from '@/store'
import { extractBlocks } from '@/utils/content-transformation'

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
  allChapters?: Chapter[]
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
  allChapters = []
}) => {
  const [selectedRound, setSelectedRound] = useState<Round | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(chapterIndex)
  const { processedContent } = useStore()

  // Get rounds for a specific chapter
  const getChapterRounds = () => {
    // Instead of using chapter.roundsRange, we need to use the current chapter's range
    if (currentChapterIndex !== chapterIndex && allChapters.length > 0) {
      const currentChapter = allChapters[currentChapterIndex];
      const [start, end] = currentChapter.roundsRange;
      return rounds.filter(round =>
        round.roundIndex >= start &&
        round.roundIndex <= end
      );
    }
    // Use the original chapter if we're still in the same chapter
    const [start, end] = chapter.roundsRange;
    return rounds.filter(round =>
      round.roundIndex >= start &&
      round.roundIndex <= end
    );
  }

  // Get rounds for a specific chapter by index
  const getRoundsForChapter = (chapterIdx: number) => {
    if (chapterIdx < 0 || chapterIdx >= allChapters.length) return [];

    const targetChapter = allChapters[chapterIdx];
    const [start, end] = targetChapter.roundsRange;

    return rounds.filter(round =>
      round.roundIndex >= start &&
      round.roundIndex <= end
    );
  }

  // Check if a round is omitted in a chapter
  const isRoundOmitted = (roundIndex: number) => {
    if (currentChapterIndex !== chapterIndex && allChapters.length > 0) {
      // Get the omitted rounds from the current chapter instead of the original chapter
      const currentChapter = allChapters[currentChapterIndex];
      return currentChapter.omit.includes(roundIndex);
    }
    return chapter.omit.includes(roundIndex);
  }

  // Calculate the padding length for the index based on total rounds
  const getPaddedIndex = (index: number) => {
    const magnitude = rounds.length.toString().length + 1
    return index.toString().padStart(magnitude, '0')
  }

  const handleRoundClick = (round: Round) => {
    // Create a copy of the round with rawContent added
    const roundContent = processedContent ? extractRoundContent(processedContent, round) : undefined;

    if (roundContent) {
      // Extract user and dungeon master content
      const { userContent, dmContent } = extractBlocks(roundContent);

      const roundWithContent = {
        ...round,
        rawContent: roundContent,
        userText: userContent,
        dmText: dmContent
      };

      setSelectedRound(roundWithContent);
    } else {
      setSelectedRound(round);
    }

    setIsDrawerOpen(true);
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedRound(null)
    setCurrentChapterIndex(chapterIndex)
  }

  // Extract the content for a specific round from the processed content
  const extractRoundContent = (content: string, round: Round): string => {
    const lines = content.split('\n')
    return lines.slice(round.startLine, round.endLine + 1).join('\n')
  }

  // Navigate to the previous round, potentially crossing chapter boundaries
  const handlePreviousRound = () => {
    if (!selectedRound) return;

    const chapterRounds = getChapterRounds();
    const currentIndex = chapterRounds.findIndex(r => r.roundIndex === selectedRound.roundIndex);

    // If not the first round in the chapter, go to the previous round
    if (currentIndex > 0) {
      const previousRound = chapterRounds[currentIndex - 1];
      handleRoundClick(previousRound);
    }
    // If it's the first round and not the first chapter, go to the last round of the previous chapter
    else if (currentIndex === 0 && currentChapterIndex > 0) {
      const previousChapterIndex = currentChapterIndex - 1;
      const previousChapterRounds = getRoundsForChapter(previousChapterIndex);

      if (previousChapterRounds.length > 0) {
        const lastRoundOfPreviousChapter = previousChapterRounds[previousChapterRounds.length - 1];
        // Update the current chapter index
        setCurrentChapterIndex(previousChapterIndex);
        handleRoundClick(lastRoundOfPreviousChapter);
      }
    }
  }

  // Navigate to the next round, potentially crossing chapter boundaries
  const handleNextRound = () => {
    if (!selectedRound) return;

    const chapterRounds = getChapterRounds();
    const currentIndex = chapterRounds.findIndex(r => r.roundIndex === selectedRound.roundIndex);

    // If not the last round in the chapter, go to the next round
    if (currentIndex < chapterRounds.length - 1) {
      const nextRound = chapterRounds[currentIndex + 1];
      handleRoundClick(nextRound);
    }
    // If it's the last round and not the last chapter, go to the first round of the next chapter
    else if (currentIndex === chapterRounds.length - 1 && currentChapterIndex < allChapters.length - 1) {
      const nextChapterIndex = currentChapterIndex + 1;
      const nextChapterRounds = getRoundsForChapter(nextChapterIndex);

      if (nextChapterRounds.length > 0) {
        const firstRoundOfNextChapter = nextChapterRounds[0];
        // Update the current chapter index
        setCurrentChapterIndex(nextChapterIndex);
        handleRoundClick(firstRoundOfNextChapter);
      }
    }
  }

  // Check if there's a previous round available, including in the previous chapter
  const hasPreviousRound = () => {
    if (!selectedRound) return false;

    const chapterRounds = getChapterRounds();
    const currentIndex = chapterRounds.findIndex(r => r.roundIndex === selectedRound.roundIndex);

    // If not the first round in the chapter, there's a previous round
    if (currentIndex > 0) {
      return true;
    }
    // If it's the first round and not the first chapter, check if there's a previous chapter with rounds
    else if (currentIndex === 0 && currentChapterIndex > 0) {
      const previousChapterRounds = getRoundsForChapter(currentChapterIndex - 1);
      return previousChapterRounds.length > 0;
    }

    return false;
  }

  // Check if there's a next round available, including in the next chapter
  const hasNextRound = () => {
    if (!selectedRound) return false;

    const chapterRounds = getChapterRounds();
    const currentIndex = chapterRounds.findIndex(r => r.roundIndex === selectedRound.roundIndex);

    // If not the last round in the chapter, there's a next round
    if (currentIndex < chapterRounds.length - 1) {
      return true;
    }
    // If it's the last round and not the last chapter, check if there's a next chapter with rounds
    else if (currentIndex === chapterRounds.length - 1 && currentChapterIndex < allChapters.length - 1) {
      const nextChapterRounds = getRoundsForChapter(currentChapterIndex + 1);
      return nextChapterRounds.length > 0;
    }

    return false;
  }

  return (
    <>
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
                    isOmitted && "opacity-50 bg-muted/50 text-muted-foreground line-through",
                    !isOmitted && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => !isOmitted && handleRoundClick(round)}
                >
                  <TableCell className="py-1 px-1">
                    <StatusBadge status={round.summaryStatus} />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-extralight text-muted-foreground py-1 px-2">
                    {getPaddedIndex(round.roundIndex)}
                  </TableCell>
                  <TableCell className={cn(
                    "max-w-md truncate text-left py-1 px-2 text-sm",
                    isOmitted && "text-muted-foreground"
                  )}>
                    {isOmitted ? (
                      <span className="italic">Omitted from summarization</span>
                    ) : (
                      round.summary || "No summary available"
                    )}
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
      <RoundDetailsDrawer
        round={selectedRound}
        open={isDrawerOpen}
        onClose={handleCloseDrawer}
        onReroll={onReroll}
        onSlideUp={onSlideUp}
        onSlideDown={onSlideDown}
        onSplit={onSplit}
        onOmit={onOmit}
        chapterIndex={currentChapterIndex}
        isFirstChapter={currentChapterIndex === 0}
        isLastChapter={currentChapterIndex === allChapters.length - 1}
        isOmitted={selectedRound ? isRoundOmitted(selectedRound.roundIndex) : false}
        onPrevious={hasPreviousRound() ? handlePreviousRound : undefined}
        onNext={hasNextRound() ? handleNextRound : undefined}
      />
    </>
  )
} 