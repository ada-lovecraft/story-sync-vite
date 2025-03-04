import { FC } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Chapter, Round, SummaryQueueItem } from "@/store"
import { ChapterTable } from './ChapterTable'
import { ChapterHeader } from './ChapterHeader'

interface ChapterPreviewCardProps {
  chapter: Chapter
  chapterIndex: number
  rounds: Round[]
  startRowsCount?: number
  endRowsCount?: number
  maxHeight?: string
  roundSummaryQueue?: SummaryQueueItem[]
}

export const ChapterPreviewCard: FC<ChapterPreviewCardProps> = ({
  chapter,
  chapterIndex,
  rounds,
  startRowsCount = 3,
  endRowsCount = 2,
  maxHeight = "250px",
  roundSummaryQueue = [],
}) => {
  // Function to get chapter rounds with proper slicing
  const getPreviewRounds = () => {
    const [start, end] = chapter.roundsRange;
    const chapterRounds = rounds.filter(round => 
      round.roundIndex >= start && 
      round.roundIndex <= end
    );
    
    if (chapterRounds.length <= startRowsCount + endRowsCount) {
      return chapterRounds; // Return all rounds if total is less than the sum of start and end counts
    }
    
    // Create synthetic rounds for start, middle (ellipses), and end
    const startRounds = chapterRounds.slice(0, startRowsCount);
    const endRounds = chapterRounds.slice(-endRowsCount);
    
    return startRounds.concat(endRounds);
  };
  
  // Check if we need an ellipsis row
  const needsEllipsis = () => {
    const [start, end] = chapter.roundsRange;
    const totalRounds = end - start + 1;
    return totalRounds > startRowsCount + endRowsCount && startRowsCount > 0 && endRowsCount > 0;
  };
  
  const previewRounds = getPreviewRounds();
  
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
          rounds={previewRounds}
          isFirstChapter={false}
          isLastChapter={false}
          onSlideUp={() => {}}
          onSlideDown={() => {}}
          onSplit={() => {}}
          onOmit={() => {}}
          onReroll={() => {}}
          hideHeader={true}
          hiddenColumns={['actions']}
          maxHeight={maxHeight}
        />
        {needsEllipsis() && (
          <div className="py-1 text-center italic text-muted-foreground text-sm mt-1">
            ...{chapter.roundsRange[1] - chapter.roundsRange[0] + 1 - startRowsCount - endRowsCount} more rounds...
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 