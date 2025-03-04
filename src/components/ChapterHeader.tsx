import { FC } from 'react'
import { CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckIcon, ListIcon, AlignJustify, BanIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Chapter, Round, SummaryQueueItem } from "@/store"

interface ChapterHeaderProps {
  chapter: Chapter
  chapterIndex: number
  rounds: Round[]
  roundSummaryQueue?: SummaryQueueItem[]
}

export const ChapterHeader: FC<ChapterHeaderProps> = ({
  chapter,
  chapterIndex,
  rounds,
  roundSummaryQueue = [],
}) => {
  const getChapterRounds = () => {
    const [start, end] = chapter.roundsRange;
    return rounds.filter(round => 
      round.roundIndex >= start && 
      round.roundIndex <= end
    );
  };

  const chapterRounds = getChapterRounds();
  
  const formattedChapterNumber = String(chapterIndex + 1).padStart(3, '0');
  
  const totalLines = chapterRounds.reduce((sum, round) => 
    chapter.omit.includes(round.roundIndex) ? sum : sum + round.lineCount, 0);
  
  const omissionsCount = chapter.omit.length;
  
  const calculateQueueProgress = () => {
    if (chapterRounds.length === 0) return 100;
    
    const roundsInQueue = chapterRounds
      .filter(round => !chapter.omit.includes(round.roundIndex))
      .filter(round => 
        round.summaryStatus === 'completed' || 
        round.summaryStatus === 'inProgress' ||
        roundSummaryQueue.some(
          item => item.id === round.roundIndex && item.type === 'round'
        )
      ).length;
    
    const nonOmittedRounds = chapterRounds.length - omissionsCount;
    return nonOmittedRounds > 0 ? (roundsInQueue / nonOmittedRounds) * 100 : 100;
  };

  const queueProgress = calculateQueueProgress();
  const isComplete = queueProgress === 100;

  return (
    <CardHeader className="pb-0">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <CardTitle>Chapter {formattedChapterNumber}</CardTitle>
        </div>

        {isComplete ? (
          <div className="flex-grow flex items-center">
            <CheckIcon className="h-4 w-4 text-green-500 ml-2" />
          </div>
        ) : (
          <div className="flex-grow flex items-center mx-2">
            <Progress value={queueProgress} className="h-2 w-full" />
          </div>
        )}
        
        <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ListIcon className="h-3.5 w-3.5" />
            <span>{chapterRounds.length}</span>
          </div>
          <Separator orientation="vertical" className="h-3" />
          <div className="flex items-center gap-1.5">
            <AlignJustify className="h-3.5 w-3.5" />
            <span>{totalLines}</span>
          </div>
          <Separator orientation="vertical" className="h-3" />
          <div className="flex items-center gap-1.5">
            <BanIcon className="h-3.5 w-3.5" />
            <span>{omissionsCount}</span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
} 