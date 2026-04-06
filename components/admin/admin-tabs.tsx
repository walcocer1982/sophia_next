'use client'

import { useState, type ReactNode } from 'react'
import { Users, LayoutGrid } from 'lucide-react'

interface AdminTabsProps {
  usersContent: ReactNode
  sectionsContent: ReactNode
}

const tabs = [
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'sections', label: 'Secciones', icon: LayoutGrid },
] as const

type TabId = (typeof tabs)[number]['id']

export function AdminTabs({ usersContent, sectionsContent }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('users')

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-lg border bg-gray-50 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'users' && usersContent}
      {activeTab === 'sections' && sectionsContent}
    </div>
  )
}
