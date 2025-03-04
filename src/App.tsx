import { useState, useEffect } from 'react'
import './App.css'
import { UploadArea } from './components/upload-area'
import { FineTuningView } from './components/fine-tuning-view'
import { SummarizationQueueView } from './components/summarization-queue-view'
import StoreTest from './components/StoreTest'
import { CodeDemo } from './components/code-demo'
import { ChapterPreviewDemo } from './components/ChapterPreviewDemo'
import { MainLayout } from './components/MainLayout'
import { SidebarProvider } from '@/components/ui/sidebar'

type ViewType = 'upload' | 'fine-tuning' | 'summary' | 'store-test' | 'code-demo' | 'chapter-preview'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('upload')
  
  // Set dark mode on load
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])
  
  // Handle sidebar navigation
  const handleSidebarNavigation = (view: ViewType) => {
    setActiveView(view)
  }

  // Render the content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'upload':
        return <UploadArea />
      case 'fine-tuning':
        return <FineTuningView />
      case 'summary':
        return <SummarizationQueueView />
      case 'store-test':
        return <StoreTest />
      case 'code-demo':
        return <CodeDemo />
      case 'chapter-preview':
        return <ChapterPreviewDemo />
      default:
        return <UploadArea />
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <MainLayout 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onSidebarNavigation={handleSidebarNavigation}
      >
        {renderContent()}
      </MainLayout>
    </SidebarProvider>
  )
}

export default App
