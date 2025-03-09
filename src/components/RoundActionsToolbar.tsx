import { FC, useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, Cross2Icon, UpdateIcon, DividerHorizontalIcon } from "@radix-ui/react-icons"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useStore, Round } from "@/store"
import { extractBlocks } from "@/utils/content-transformation"
import { roundPrompt } from "@/data/round-prompt"
import { toast } from "sonner"

interface RoundActionsToolbarProps {
  roundIndex: number
  chapterIndex: number
  isFirstChapter: boolean
  isLastChapter: boolean
  isOmitted: boolean
  onSlideUp: (chapterIndex: number, roundIndex: number) => void
  onSlideDown: (chapterIndex: number, roundIndex: number) => void
  onSplit: (chapterIndex: number, roundIndex: number) => void
  onOmit: (chapterIndex: number, roundIndex: number, currentOmitted: boolean) => void
  onReroll?: (roundIndex: number) => void
  size?: 'xs' | 'sm'
}

export const RoundActionsToolbar: FC<RoundActionsToolbarProps> = ({
  roundIndex,
  chapterIndex,
  isFirstChapter,
  isLastChapter,
  isOmitted,
  onSlideUp,
  onSlideDown,
  onSplit,
  onOmit,
  onReroll,
  size = 'sm'
}) => {
  const isExtraSmall = size === 'xs';
  const { rounds, updateRound, rerollRoundSummary, processRoundSummaryQueue } = useStore();
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleReroll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Validate roundIndex
    if (roundIndex === undefined) {
      console.error('RoundActionsToolbar: roundIndex is undefined');
      toast.error("Cannot reroll: round index is undefined");
      return;
    }
    
    console.log('RoundActionsToolbar: handleReroll', { roundIndex });
    
    // Debug rounds data
    console.log('Available rounds:', rounds.map(r => ({ 
      roundIndex: r.roundIndex, 
      hasRawContent: !!r.rawContent,
      contentLength: r.rawContent?.length || 0
    })));
    
    const round = rounds.find(r => r.roundIndex === roundIndex);
    
    if (!round) {
      console.error(`Round with index ${roundIndex} not found in rounds array`);
      toast.error(`Cannot reroll: round ${roundIndex} not found`);
      return;
    }
    
    // Call onReroll to handle any UI updates
    if (typeof onReroll === 'function') {
      onReroll(roundIndex);
    } else {
      console.warn('RoundActionsToolbar: onReroll is not a function');
    }
    
    // Mark the round as being processed and enqueue it for summarization
    rerollRoundSummary(roundIndex);
    
    // Set UI state
    setIsGenerating(true);
    
    // Start processing the queue
    try {
      await processRoundSummaryQueue();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex justify-end">
      {roundIndex === undefined ? (
        <div className="text-xs text-destructive">Missing roundIndex</div>
      ) : (
        <TooltipProvider delayDuration={300}>
          <div className={cn(
            "inline-flex items-center rounded-md bg-background text-muted-foreground shadow-sm",
            isExtraSmall ? "py-1 px-0 text-xs" : "h-6 p-0"
          )}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm text-xs",
                    isExtraSmall ? "h-4 my-0 px-0.25" : "h-6 px-0.5",
                    isFirstChapter && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isFirstChapter}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlideUp(chapterIndex, roundIndex);
                  }}
                >
                  <ArrowUpIcon className={isExtraSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Slide Up</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm text-xs",
                    isExtraSmall ? "h-4 my-0 px-0.25" : "h-6 px-0.5",
                    isLastChapter && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isLastChapter}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlideDown(chapterIndex, roundIndex);
                  }}
                >
                  <ArrowDownIcon className={isExtraSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Slide Down</TooltipContent>
            </Tooltip>

            <div className={cn(
              "w-px bg-border",
              isExtraSmall ? "h-3 mx-0" : "h-3.5 mx-0.5"
            )} aria-hidden="true" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm text-xs",
                    isExtraSmall ? "h-4 my-0 px-0.25" : "h-6 px-0.5"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplit(chapterIndex, roundIndex);
                  }}
                >
                  <DividerHorizontalIcon className={isExtraSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Split</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm text-xs",
                    isExtraSmall ? "h-4 my-0 px-0.25" : "h-6 px-0.5",
                    !isOmitted
                      ? "text-[#eb6f92] hover:text-[#eb6f92] hover:bg-[#eb6f92]/10"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOmit(chapterIndex, roundIndex, isOmitted);
                  }}
                >
                  <Cross2Icon className={isExtraSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isOmitted ? "Include" : "Omit"}</TooltipContent>
            </Tooltip>

            <div className={cn(
              "w-px bg-border",
              isExtraSmall ? "h-3 mx-0" : "h-3.5 mx-0.5"
            )} aria-hidden="true" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-sm text-xs",
                    isExtraSmall ? "h-4 my-0 px-0.25" : "h-6 px-0.5",
                    isGenerating && "opacity-50 cursor-not-allowed"
                  )}
                  disabled={isGenerating}
                  onClick={handleReroll}
                >
                  <UpdateIcon className={isExtraSmall ? "h-2.5 w-2.5" : "h-3 w-3"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reroll</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      )}
    </div>
  )
} 