import { useStore } from '../store'

interface QueuePanelProps {
  setActiveView: (view: any) => void
}

export function QueuePanel({ setActiveView }: QueuePanelProps) {
  const { roundSummaryQueue } = useStore()

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {roundSummaryQueue.slice(0, 6).map((item) => (
            <div 
              key={item.id} 
              className="p-3 rounded border flex justify-between items-center"
            >
              <div>
                <div className="font-medium">Round {item.id}</div>
                <div className="text-xs text-muted-foreground">
                  {item.status === 'inProgress' 
                    ? "Processing..." 
                    : item.status === 'completed'
                      ? "Completed"
                      : item.status === 'failed'
                        ? "Failed"
                        : "Waiting"}
                </div>
              </div>
              <div className={`h-2 w-2 rounded-full ${
                item.status === 'inProgress' 
                  ? 'bg-blue-500 animate-pulse' 
                  : item.status === 'completed'
                    ? 'bg-green-500'
                    : item.status === 'failed'
                      ? 'bg-red-500'
                      : 'bg-muted'
              }`} />
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