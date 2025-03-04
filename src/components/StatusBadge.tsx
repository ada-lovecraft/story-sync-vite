import { FC } from 'react'
import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status?: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  switch(status) {
    case 'completed':
      return <Badge>Summarized</Badge>
    case 'inProgress':
      return <Badge variant="secondary">In Progress</Badge>
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>
    default:
      return <Badge variant="outline">Pending</Badge>
  }
} 