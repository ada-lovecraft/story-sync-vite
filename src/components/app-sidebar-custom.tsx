import * as React from "react"
import { ChevronRight, type LucideIcon } from "lucide-react"

import { appData } from "./app-data"
import { NavTools } from "@/components/nav-tools"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface AppSidebarCustomProps extends React.ComponentProps<typeof Sidebar> {
  onNavigation: (view: any) => void
}

export function AppSidebarCustom({ onNavigation, ...props }: AppSidebarCustomProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={appData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <CustomNavMain items={appData.navMain} onNavigation={onNavigation} />
        <NavTools projects={appData.projects} onNavigation={onNavigation} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={appData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function CustomNavMain({
  items,
  onNavigation
}: {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    action?: string
    items?: {
      title: string
      url: string
      action?: string
    }[]
  }[]
  onNavigation: (view: any) => void
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton 
                  tooltip={item.title}
                  onClick={() => item.action && onNavigation(item.action)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.items && (
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {item.items && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton 
                          onClick={() => subItem.action && onNavigation(subItem.action)}
                        >
                          <span>{subItem.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 