import { ReactNode, useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/sonner"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { AppSidebarCustom } from './app-sidebar-custom'
import { QueuePanel } from './QueuePanel'
import { Button } from '@/components/ui/button'

interface MainLayoutProps {
  children: ReactNode
  activeView: 'upload' | 'fine-tuning' | 'summary' | 'store-test' | 'code-demo' | 'chapter-preview' | 'tools' | 'meta-prompter'
  setActiveView: (view: any) => void
  onSidebarNavigation: (view: any) => void
}

export function MainLayout({
  children,
  activeView,
  setActiveView,
  onSidebarNavigation
}: MainLayoutProps) {
  // State for controlling the queue sheet
  const [isQueueOpen, setIsQueueOpen] = useState(false)

  // Close the sheet when leaving the fine-tuning view
  useEffect(() => {
    if (activeView !== 'fine-tuning') {
      setIsQueueOpen(false)
    }
  }, [activeView])

  // Function to get breadcrumb label based on active view
  const getBreadcrumbLabel = () => {
    switch (activeView) {
      case 'upload':
        return 'Upload Area'
      case 'fine-tuning':
        return 'Fine Tuning'
      case 'summary':
        return 'Summarization Queue'
      case 'store-test':
        return 'Store Test'
      case 'code-demo':
        return 'Code Demo'
      case 'chapter-preview':
        return 'Chapter Preview'
      case 'tools':
        return 'Tools'
      case 'meta-prompter':
        return 'Meta Prompter'
      default:
        return 'Dashboard'
    }
  }

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebarCustom
        className="h-full border-r"
        onNavigation={onSidebarNavigation}
      />

      {/* Main Content */}
      <SidebarInset className="flex-1 flex flex-col overflow-hidden">
        {/* Header with breadcrumbs */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="flex items-center gap-1 ml-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="#">Story Sync</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{getBreadcrumbLabel()}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Queue sheet trigger button - only show in fine-tuning view */}
          {activeView === 'fine-tuning' && (
            <div className="ml-auto">
              <Sheet open={isQueueOpen} onOpenChange={setIsQueueOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    View Queue
                  </Button>
                </SheetTrigger>
              </Sheet>
            </div>
          )}
        </header>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          <div className="mx-auto">
            {/* Main content - actual component from children */}
            <div className="rounded-xl p-4">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Queue panel in sheet - only rendered in fine-tuning view */}
      {activeView === 'fine-tuning' && (
        <Sheet open={isQueueOpen} onOpenChange={setIsQueueOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Round Queue</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <QueuePanel setActiveView={setActiveView} />
            </div>
          </SheetContent>
        </Sheet>
      )}

      <Toaster />
    </div>
  )
} 