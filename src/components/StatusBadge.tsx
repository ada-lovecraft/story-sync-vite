import { FC } from 'react'
import { DotFilledIcon } from "@radix-ui/react-icons"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  switch(status) {
    case 'completed':
      return (
        <DotFilledIcon className="h-4 w-4 text-green-500" />
      )
    case 'inProgress':
      return (
        <DotFilledIcon className="h-4 w-4 text-yellow-500 animate-pulse" />
      )
    case 'failed':
      return (
        <DotFilledIcon className="h-4 w-4 text-red-500" />
      )
    case 'next_queued':
      return (
        <DotFilledIcon className="h-4 w-4 text-gray-500 animate-pulse" />
      )
    default:
      return (
        <DotFilledIcon className="h-4 w-4 text-gray-800/40" />
      )
  }
} 