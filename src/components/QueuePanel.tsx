import { useStore } from '../store'
import { cva } from 'class-variance-authority'
import { cn } from "@/lib/utils"

interface QueuePanelProps {
  setActiveView: (view: any) => void
}

// Define status indicator styles
const statusIndicator = cva("h-2 w-2 rounded-full", {
  variants: {
    status: {
      pending: "bg-muted",
      inProgress: "bg-blue-500 animate-pulse",
      completed: "bg-green-500",
      failed: "bg-red-500",
      rerolled: "bg-amber-500",
    }
  },
  defaultVariants: {
    status: "pending"
  }
})

// Define card styles
const queueCard = cva("p-3 rounded border flex justify-between items-center", {
  variants: {
    status: {
      pending: "border-muted bg-background",
      inProgress: "border-blue-500/20 bg-blue-500/5",
      completed: "border-green-500/20 bg-green-500/5",
      failed: "border-red-500/20 bg-red-500/5",
      rerolled: "border-amber-500/20 bg-amber-500/5",
    },
    position: {
      top: "border-l-4",
      normal: ""
    }
  },
  defaultVariants: {
    status: "pending",
    position: "normal"
  }
})

export function QueuePanel({ setActiveView }: QueuePanelProps) {
  const { roundSummaryQueue, rounds } = useStore()

  // Get round info with summary for display
  const getRoundSummary = (roundId: number) => {
    const round = rounds.find(r => r.roundIndex === roundId)
    return round?.summary || "No summary available"
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Round Queue
        {roundSummaryQueue.length > 0 && (
          <span className="ml-2 text-sm bg-primary/10 text-primary py-0.5 px-2 rounded-full">
            {roundSummaryQueue.length}
          </span>
        )}
      </h2>
      
      {roundSummaryQueue.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          No rounds in queue yet. Use the "Reroll" button in the Chapter Fine-Tuning view to add rounds.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {roundSummaryQueue.slice(0, 6).map((item, index) => (
            <div 
              key={item.id} 
              className={cn(queueCard({
                status: item.status,
                position: index === 0 ? "top" : "normal"
              }))}
            >
              <div className="overflow-hidden">
                <div className="font-medium flex items-center gap-2">
                  <span>Round {item.id}</span>
                  {index === 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary">
                      Next
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[16rem]">
                  {getRoundSummary(item.id)}
                </div>
                <div className="text-xs font-medium mt-1">
                  {item.status === 'inProgress' 
                    ? "Processing..." 
                    : item.status === 'completed'
                      ? "Completed"
                      : item.status === 'failed'
                        ? "Failed"
                        : index === 0
                          ? "Next in queue"
                          : "Waiting"}
                </div>
              </div>
              <div className={statusIndicator({ status: item.status })} />
            </div>
          ))}
        </div>
      )}
      
      {roundSummaryQueue.length > 6 && (
        <div className="text-center mt-4">
          <a 
            className="text-sm text-primary hover:underline cursor-pointer"
            onClick={() => setActiveView('summary')}
          >
            + {roundSummaryQueue.length - 6} more in queue • View full queue →
          </a>
        </div>
      )}
    </div>
  )
} 