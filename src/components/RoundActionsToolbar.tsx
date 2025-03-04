import { FC } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, Cross2Icon, UpdateIcon, DividerHorizontalIcon } from "@radix-ui/react-icons"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

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
  onReroll: (roundIndex: number) => void
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
  onReroll
}) => {
  return (
    <div className="flex justify-end">
      <TooltipProvider delayDuration={300}>
        <div className="inline-flex h-6 items-center rounded-md border bg-background p-0 text-muted-foreground shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 rounded-sm px-0.5 text-xs",
                  isFirstChapter && "opacity-50 cursor-not-allowed"
                )}
                disabled={isFirstChapter}
                onClick={() => onSlideUp(chapterIndex, roundIndex)}
              >
                <ArrowUpIcon className="h-3 w-3" />
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
                  "h-6 rounded-sm px-0.5 text-xs",
                  isLastChapter && "opacity-50 cursor-not-allowed"
                )}
                disabled={isLastChapter}
                onClick={() => onSlideDown(chapterIndex, roundIndex)}
              >
                <ArrowDownIcon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Slide Down</TooltipContent>
          </Tooltip>

          <div className="h-3.5 w-[0.5px] bg-border" aria-hidden="true" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                className="h-6 rounded-sm px-0.5 text-xs"
                onClick={() => onSplit(chapterIndex, roundIndex)}
              >
                <DividerHorizontalIcon className="h-3 w-3" />
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
                  "h-6 rounded-sm px-0.5 text-xs",
                  !isOmitted 
                    ? "text-[#eb6f92] hover:text-[#eb6f92] hover:bg-[#eb6f92]/10" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => onOmit(chapterIndex, roundIndex, isOmitted)}
              >
                <Cross2Icon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isOmitted ? "Include" : "Omit"}</TooltipContent>
          </Tooltip>

          <div className="h-3.5 w-[0.5px] bg-border" aria-hidden="true" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                className="h-6 rounded-sm px-0.5 text-xs"
                onClick={() => onReroll(roundIndex)}
              >
                <UpdateIcon className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reroll</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
} 