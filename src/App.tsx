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

function App() {
  const [activeView, setActiveView] = useState<'upload' | 'fine-tuning' | 'summary' | 'store-test'>('upload')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar setActiveView={setActiveView} />
      
      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar />
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={60}>
            <main className="h-full p-6">
              {activeView === 'upload' && <UploadArea />}
              {activeView === 'fine-tuning' && <FineTuningView />}
              {activeView === 'summary' && <SummarizationQueueView />}
              {activeView === 'store-test' && <StoreTest />}
            </main>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          <ResizablePanel defaultSize={20}>
            <div className="h-full p-4 border-l">
              <h2 className="text-xl font-semibold mb-4">Queue</h2>
              {/* Summarization queue will go here */}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      <Toaster />
    </div>
  )
}

export default App
