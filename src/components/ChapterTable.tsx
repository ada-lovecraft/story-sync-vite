import { FC, useState, useMemo, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Chapter, Round, SummaryQueueItem } from "@/store"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RoundActionsToolbar } from './RoundActionsToolbar'
import { StatusBadge } from './StatusBadge'
import { RoundDetailsDrawer } from './RoundDetailsDrawer'
import { useStore } from '@/store'
import { extractBlocks } from '@/utils/content-transformation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PlayIcon, PauseIcon, RefreshCwIcon } from "lucide-react"
import { StreamingSummary } from './StreamingSummary'
import { useIsRoundInQueue, useStreamingState, useQueueActions } from '@/store/selectors'

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
  
  // Use optimized selectors for better performance
  const { 
    processedContent,
    roundSummaryQueue
  } = useStore(state => ({
    processedContent: state.processedContent,
    roundSummaryQueue: state.roundSummaryQueue
  }))
  
  // Use queue actions from the optimized selector
  const { 
    enqueueRoundSummary, 
    dequeueRoundSummary,
    processRoundSummaryQueue 
  } = useQueueActions()

  // Compute local queue for just this chapter's rounds
  const chapterQueue = useMemo(() => {
    return roundSummaryQueue.filter(item => {
      // Check if this queue item corresponds to a round in this chapter
      const [start, end] = chapter.roundsRange;
      return item.type === 'round' && item.id >= start && item.id <= end;
    });
  }, [roundSummaryQueue, chapter.roundsRange]);

  // Extract the content for a specific round from the processed content - no dependencies
  const extractRoundContent = useCallback((content: string, round: Round): string => {
    const lines = content.split('\n')
    return lines.slice(round.startLine, round.endLine + 1).join('\n')
  }, [])

  // Get rounds for a specific chapter - memoize with no circular dependencies
  const getChapterRounds = useCallback(() => {
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
  }, [currentChapterIndex, chapterIndex, allChapters, rounds, chapter.roundsRange])

  // Get rounds for a specific chapter by index - memoize with no circular dependencies
  const getRoundsForChapter = useCallback((chapterIdx: number) => {
    if (chapterIdx < 0 || chapterIdx >= allChapters.length) return [];

    const targetChapter = allChapters[chapterIdx];
    const [start, end] = targetChapter.roundsRange;

    return rounds.filter(round =>
      round.roundIndex >= start &&
      round.roundIndex <= end
    );
  }, [allChapters, rounds])

  // Check if a round is omitted in a chapter
  const isRoundOmitted = useCallback((roundIndex: number) => {
    if (currentChapterIndex !== chapterIndex && allChapters.length > 0) {
      // Get the omitted rounds from the current chapter instead of the original chapter
      const currentChapter = allChapters[currentChapterIndex];
      return currentChapter.omit.includes(roundIndex);
    }
    return chapter.omit.includes(roundIndex);
  }, [currentChapterIndex, chapterIndex, allChapters, chapter.omit])

  // Calculate the padding length for the index based on total rounds
  const getPaddedIndex = useCallback((index: number) => {
    const magnitude = rounds.length.toString().length + 1
    return index.toString().padStart(magnitude, '0')
  }, [rounds.length])

  // Add a selector for checking if a round is in the queue (more optimized)
  const isRoundInQueueSelector = useIsRoundInQueue

  // Add a round to the summarization queue
  const addToQueue = useCallback((roundIndex: number) => {
    enqueueRoundSummary(roundIndex);
  }, [enqueueRoundSummary])

  // Remove a round from the summarization queue
  const removeFromQueue = useCallback((roundIndex: number) => {
    dequeueRoundSummary(roundIndex);
  }, [dequeueRoundSummary])

  // Memoize the round click handler
  const handleRoundClick = useCallback((round: Round) => {
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
  }, [processedContent, extractRoundContent])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedRound(null)
    setCurrentChapterIndex(chapterIndex)
  }, [chapterIndex])

  // Check if there's a previous round available, including in the previous chapter
  const hasPreviousRound = useCallback(() => {
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
  }, [selectedRound, currentChapterIndex, getChapterRounds, getRoundsForChapter])

  const hasNextRound = useCallback(() => {
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
  }, [selectedRound, currentChapterIndex, allChapters.length, getChapterRounds, getRoundsForChapter])

  // Navigate to the previous round, potentially crossing chapter boundaries
  const handlePreviousRound = useCallback(() => {
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
  }, [selectedRound, currentChapterIndex, getChapterRounds, getRoundsForChapter, handleRoundClick])

  const handleNextRound = useCallback(() => {
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
  }, [selectedRound, currentChapterIndex, allChapters.length, getChapterRounds, getRoundsForChapter, handleRoundClick])

  // Summarize all rounds in the chapter
  const summarizeAllRounds = useCallback(() => {
    const chapterRounds = getChapterRounds();
    // Filter out omitted rounds
    const eligibleRounds = chapterRounds.filter(round => !isRoundOmitted(round.roundIndex));
    
    // Add each eligible round to the queue
    eligibleRounds.forEach(round => {
      enqueueRoundSummary(round.roundIndex);
    });
    
    // Start processing the queue
    processRoundSummaryQueue();
  }, [getChapterRounds, isRoundOmitted, enqueueRoundSummary, processRoundSummaryQueue]);

  // Get the queue statistics for this chapter
  const getQueueStats = useCallback(() => {
    const total = chapterQueue.length;
    const pending = chapterQueue.filter(item => item.status === 'pending').length;
    const inProgress = chapterQueue.filter(item => item.status === 'inProgress').length;
    const completed = chapterQueue.filter(item => item.status === 'completed').length;
    const failed = chapterQueue.filter(item => item.status === 'failed').length;
    
    return { total, pending, inProgress, completed, failed };
  }, [chapterQueue])

  // Queue stats for display
  const queueStats = useMemo(() => getQueueStats(), [getQueueStats]);
  const hasQueuedRounds = useMemo(() => queueStats.total > 0, [queueStats.total]);

  // Memoize chapter rounds to avoid recalculating on every render
  const chapterRounds = useMemo(() => getChapterRounds(), [getChapterRounds]);

  return (
    <>
      {/* Chapter Queue Summary and Controls */}
      {hasQueuedRounds && (
        <div className="mb-4 p-2 rounded-md border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Round Queue:</span>
              <Badge variant="outline" className="bg-background">
                {queueStats.total} round{queueStats.total !== 1 ? 's' : ''}
              </Badge>
              {queueStats.inProgress > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {queueStats.inProgress} processing
                </Badge>
              )}
              {queueStats.completed > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {queueStats.completed} completed
                </Badge>
              )}
              {queueStats.failed > 0 && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {queueStats.failed} failed
                </Badge>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={processRoundSummaryQueue}
                disabled={queueStats.pending === 0}
              >
                <PlayIcon className="h-4 w-4 mr-1" />
                Process Queue
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-2 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={summarizeAllRounds}
          className="text-xs"
        >
          <RefreshCwIcon className="h-3 w-3 mr-1" />
          Summarize All Rounds
        </Button>
      </div>

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
            {chapterRounds.map((round) => {
              const isOmitted = isRoundOmitted(round.roundIndex);
              const queueItem = isRoundInQueueSelector(round.roundIndex);
              const isQueued = queueItem.inQueue;
              
              return (
                <TableRow
                  key={round.roundIndex}
                  className={cn(
                    "py-1",
                    isOmitted && "opacity-50 bg-muted/50 text-muted-foreground line-through",
                    !isOmitted && "cursor-pointer hover:bg-muted/50",
                    isQueued && queueItem.isProcessing && "bg-blue-50",
                    round.summaryStatus === 'completed' && "bg-green-50",
                    round.summaryStatus === 'failed' && "bg-red-50"
                  )}
                  onClick={() => !isOmitted && handleRoundClick(round)}
                >
                  <TableCell className="py-1 px-1">
                    <StatusBadge status={isQueued && queueItem.isProcessing ? 'inProgress' : round.summaryStatus} />
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
                      <div className="flex items-center space-x-2">
                        <StreamingSummary 
                          roundIndex={round.roundIndex}
                          className="truncate" 
                          fallbackText="No summary available"
                          useErrorBoundary={false}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-1 px-2 min-w-[120px]">
                    <div className="flex justify-end space-x-1">
                      {!isOmitted && (
                        <>
                          {isQueued ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromQueue(round.roundIndex);
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <PauseIcon className="h-3 w-3 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToQueue(round.roundIndex);
                              }}
                              className="h-7 px-2 text-xs"
                            >
                              <PlayIcon className="h-3 w-3 mr-1" />
                              Queue
                            </Button>
                          )}
                        </>
                      )}
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
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </ScrollArea>
      
      {/* Only render the RoundDetailsDrawer when it's needed */}
      {isDrawerOpen && selectedRound && (
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
      )}
    </>
  )
} 