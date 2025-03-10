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
import { WorkerProvider } from '@/components/WorkerProvider'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { useStore } from '@/store'
import { toast } from 'sonner'

type ViewType = 'upload' | 'fine-tuning' | 'store-test' | 'code-demo' | 'chapter-preview' | 'tools' | 'meta-prompter' | 'meta-prompt-tester'

// localStorage key for persisting the active view
const ACTIVE_VIEW_STORAGE_KEY = 'story-sync-active-view'

function App() {
  const [activeView, setActiveView] = useState<ViewType>('upload')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const resetStore = useStore(state => state.resetStore)

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

  // Add a key handler for the emergency reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Alt + R to show the reset dialog
      if (e.ctrlKey && e.altKey && e.key === 'r') {
        setShowResetDialog(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  // Emergency reset function
  const handleEmergencyReset = () => {
    try {
      // Clear localStorage
      localStorage.removeItem('story-sync-storage')
      
      // Reset store state
      resetStore()
      
      // Clear any worker instances
      if (typeof window !== 'undefined' && (window as any).workerManager) {
        (window as any).workerManager.abortAll?.()
      }
      
      toast.success('Application has been reset. Reloading page...')
      
      // Force reload after a short delay
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Failed to reset application:', error)
      toast.error('Reset failed. Please try reloading the page manually.')
    } finally {
      setShowResetDialog(false)
    }
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
    <WorkerProvider>
      <SidebarProvider defaultOpen={true}>
        <MainLayout
          activeView={activeView}
          setActiveView={setActiveView}
          onSidebarNavigation={handleSidebarNavigation}
        >
          {renderContent()}
        </MainLayout>
        
        {/* Emergency Reset Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Emergency Reset
              </DialogTitle>
              <DialogDescription>
                This will reset the application and clear all stored data. 
                Use this only if the application is stuck or not responding correctly.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleEmergencyReset}>
                Reset Application
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarProvider>
    </WorkerProvider>
  )
}

export default App
