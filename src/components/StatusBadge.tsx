import { FC } from 'react'
import { DotFilledIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface StatusBadgeProps {
  status?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  let icon = <DotFilledIcon className="h-4 w-4 text-gray-800/40" />
  let tooltipText = "Not processed"
  
  switch(status) {
    case 'completed':
      icon = <DotFilledIcon className="h-4 w-4 text-green-500" />
      tooltipText = "Completed"
      break
    case 'inProgress':
      icon = <DotFilledIcon className="h-4 w-4 text-blue-500 animate-pulse" />
      tooltipText = "Processing"
      break
    case 'pending':
      icon = <DotFilledIcon className="h-4 w-4 text-yellow-500" />
      tooltipText = "Queued"
      break
    case 'failed':
      icon = <DotFilledIcon className="h-4 w-4 text-red-500" />
      tooltipText = "Failed"
      break
    case 'next_queued':
      icon = <DotFilledIcon className="h-4 w-4 text-gray-500 animate-pulse" />
      tooltipText = "Next in queue"
      break
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{icon}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 