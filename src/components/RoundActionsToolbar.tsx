import { FC } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowUpIcon, ArrowDownIcon, Cross2Icon, UpdateIcon, DividerHorizontalIcon } from "@radix-ui/react-icons"

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
    <div className="flex justify-end gap-1">
      <Button 
        variant="outline" 
        size="icon" 
        title="Slide Up"
        disabled={isFirstChapter}
        onClick={() => onSlideUp(chapterIndex, roundIndex)}
      >
        <ArrowUpIcon className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        title="Slide Down"
        disabled={isLastChapter}
        onClick={() => onSlideDown(chapterIndex, roundIndex)}
      >
        <ArrowDownIcon className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        title="Split"
        onClick={() => onSplit(chapterIndex, roundIndex)}
      >
        <DividerHorizontalIcon className="h-4 w-4" />
      </Button>
      <Button 
        variant={isOmitted ? "default" : "outline"}
        size="icon" 
        title={isOmitted ? "Include" : "Omit"}
        onClick={() => onOmit(chapterIndex, roundIndex, isOmitted)}
      >
        <Cross2Icon className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="icon" 
        title="Reroll"
        onClick={() => onReroll(roundIndex)}
      >
        <UpdateIcon className="h-4 w-4" />
      </Button>
    </div>
  )
} 