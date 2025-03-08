import { useState, useEffect } from 'react'
import './App.css'
import { UploadArea } from '@/components/upload-area'
import { FineTuningView } from '@/components/fine-tuning-view'
import { SummarizationQueueView } from '@/components/summarization-queue-view'
import StoreTest from '@/components/StoreTest'
import { CodeDemo } from '@/components/code-demo'
import { ChapterPreviewDemo } from '@/components/ChapterPreviewDemo'
import { ToolsView } from '@/components/ToolsView'
import { MetaPrompter } from '@/components/MetaPrompter'
import { MainLayout } from '@/components/MainLayout'
import { SidebarProvider } from '@/components/ui/sidebar'

type ViewType = 'upload' | 'fine-tuning' | 'summary' | 'store-test' | 'code-demo' | 'chapter-preview' | 'tools' | 'meta-prompter'

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

  // Handle navigation from upload to fine-tuning
  const handleNextFromUpload = () => {
    setActiveView('fine-tuning')
  }

  // Render the content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'upload':
        return <UploadArea onNext={handleNextFromUpload} />
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
      case 'tools':
        return <ToolsView />
      case 'meta-prompter':
        return <MetaPrompter />
      default:
        return <UploadArea onNext={handleNextFromUpload} />
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
