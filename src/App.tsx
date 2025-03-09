import { useState, useEffect } from 'react'
import './App.css'
import { UploadArea } from '@/components/upload-area'
import { FineTuningView } from '@/components/fine-tuning-view'
import StoreTest from '@/components/StoreTest'
import { CodeDemo } from '@/components/code-demo'
import { ChapterPreviewDemo } from '@/components/ChapterPreviewDemo'
import { ToolsView } from '@/components/ToolsView'
import { MetaPrompter } from '@/components/MetaPrompter'
import { MetaPromptTester } from '@/components/MetaPromptTester'
import { MainLayout } from '@/components/MainLayout'
import { SidebarProvider } from '@/components/ui/sidebar'

type ViewType = 'upload' | 'fine-tuning' | 'store-test' | 'code-demo' | 'chapter-preview' | 'tools' | 'meta-prompter' | 'meta-prompt-tester'

// localStorage key for persisting the active view
const ACTIVE_VIEW_STORAGE_KEY = 'story-sync-active-view'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('upload')
  const [isInitialized, setIsInitialized] = useState(false)

  // Set dark mode on load
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Hydrate activeView from localStorage on mount
  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY) as ViewType | null
      
      // If there's a valid saved view, use it
      if (savedView && isValidViewType(savedView)) {
        setActiveView(savedView)
      }
      
      setIsInitialized(true)
    }
  }, [])

  // Persist activeView to localStorage when it changes
  useEffect(() => {
    // Only update localStorage after initial hydration and on the client side
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView)
    }
  }, [activeView, isInitialized])

  // Type guard to validate the view type
  function isValidViewType(view: string): view is ViewType {
    return ['upload', 'fine-tuning', 'store-test', 'code-demo', 
            'chapter-preview', 'tools', 'meta-prompter', 
            'meta-prompt-tester'].includes(view)
  }

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
      case 'meta-prompt-tester':
        return <MetaPromptTester />
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
