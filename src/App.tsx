import { useState } from 'react'
import './App.css'
import { Toaster } from "@/components/ui/sonner"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ModeToggle } from './components/mode-toggle'
import { Sidebar } from './components/sidebar'
import { Navbar } from './components/navbar'
import { UploadArea } from './components/upload-area'
import { FineTuningView } from './components/fine-tuning-view'
import { SummarizationQueueView } from './components/summarization-queue-view'
import StoreTest from './components/StoreTest'
import { CodeDemo } from './components/code-demo'
import { ChapterPreviewDemo } from './components/ChapterPreviewDemo'
import { useStore } from './store'

function App() {
  const [activeView, setActiveView] = useState<'upload' | 'fine-tuning' | 'summary' | 'store-test' | 'code-demo' | 'chapter-preview'>('upload')
  const { roundSummaryQueue } = useStore()
  
  // Handle sidebar navigation
  const handleSidebarNavigation = (view: 'upload' | 'fine-tuning' | 'summary') => {
    setActiveView(view)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar setActiveView={setActiveView} />
      
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar onNavigation={handleSidebarNavigation} />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60}>
            <main className="h-full p-6">
              {activeView === 'upload' && <UploadArea />}
              {activeView === 'fine-tuning' && <FineTuningView />}
              {activeView === 'summary' && <SummarizationQueueView />}
              {activeView === 'store-test' && <StoreTest />}
              {activeView === 'code-demo' && <CodeDemo />}
              {activeView === 'chapter-preview' && <ChapterPreviewDemo />}
            </main>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={20}>
            <div className="h-full p-4 border-l">
              <h2 className="text-xl font-semibold mb-4">
                Round Queue
                {roundSummaryQueue.length > 0 && (
                  <span className="ml-2 text-sm bg-primary/10 text-primary py-0.5 px-2 rounded-full">
                    {roundSummaryQueue.length}
                  </span>
                )}
              </h2>
              
              {roundSummaryQueue.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No rounds in queue yet. Use the "Reroll" button in the Chapter Fine-Tuning view to add rounds.
                </div>
              ) : (
                <div className="space-y-2">
                  {roundSummaryQueue.slice(0, 5).map((item) => (
                    <div 
                      key={item.id} 
                      className="p-2 rounded border flex justify-between items-center"
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
                  
                  {roundSummaryQueue.length > 5 && (
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      + {roundSummaryQueue.length - 5} more in queue
                    </div>
                  )}
                  
                  <div className="text-center mt-4">
                    <a 
                      className="text-sm text-primary hover:underline cursor-pointer"
                      onClick={() => setActiveView('summary')}
                    >
                      View full queue →
                    </a>
                  </div>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <Toaster />
    </div>
  )
}

export default App
