import {
  AudioWaveform,
  BookOpen,
  Bot,
  BookMarked,
  Upload,
  FileEdit,
  Settings2,
  Code,
  GalleryVerticalEnd,
  Command,
  Inbox,
  Music,
  MoreHorizontal,
  Wrench,
} from "lucide-react"

// App navigation data
export const appData = {
  user: {
    name: "John Doe",
    email: "johndoe@example.com",
    avatar: "/avatars/default-avatar.jpg",
  },
  teams: [
    {
      name: "Story Sync",
      logo: Upload,
      plan: "Pro",
    },
    {
      name: "Personal",
      logo: Command,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Upload",
      url: "#",
      icon: Upload,
      isActive: true,
      action: 'upload'
    },
    {
      title: "Fine Tuning",
      url: "#",
      icon: FileEdit,
      action: 'fine-tuning'
    },
    {
      title: "Summary",
      url: "#",
      icon: Inbox,
      action: 'summary'
    },
    {
      title: "Demo",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Store Test",
          url: "#",
          action: 'store-test'
        },
        {
          title: "Code Demo",
          url: "#",
          action: 'code-demo'
        },
        {
          title: "Chapter Preview",
          url: "#",
          action: 'chapter-preview'
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
    },
  ],
  projects: [
    {
      name: "Prompt Tester",
      url: "#",
      icon: Wrench,
      action: 'tools'
    },
    {
      name: "Meta Prompter",
      url: "#",
      icon: Bot,
      action: 'meta-prompter'
    },
    {
      name: "Story Project 1",
      url: "#",
      icon: Upload,
    },
    {
      name: "Code Project",
      url: "#",
      icon: Code,
    },
    {
      name: "Audio Project",
      url: "#",
      icon: Music,
    },
    {
      name: "More",
      url: "#",
      icon: MoreHorizontal,
    }
  ],
} 