'use client'

import { useState, useMemo } from 'react'
import { LearningSidebar } from './learning-sidebar'
import { ImagePanel, type ActivityImage } from './image-panel'
import { TestModeBanner } from './test-mode-banner'
import { ProgressProvider, useProgress } from './progress-context'
import { PanelLeft, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityImageWithId extends ActivityImage {
  activityId: string
}

interface LearningLayoutProps {
  children: React.ReactNode
  sessionId: string
  instructorName: string
  lessonTitle: string
  objective: string
  keyPoints: string[]
  allImages: ActivityImageWithId[]
  videoUrl?: string | null
  initialProgress: {
    current: number
    total: number
    percentage: number
  }
  testMode?: {
    courseId: string
    activities: { id: string; type: string; title: string }[]
  }
}

export function LearningLayout({
  children,
  sessionId,
  instructorName,
  lessonTitle,
  objective,
  keyPoints,
  allImages,
  videoUrl,
  initialProgress,
  testMode,
}: LearningLayoutProps) {
  return (
    <ProgressProvider sessionId={sessionId} initialProgress={initialProgress}>
      <LearningLayoutInner
        sessionId={sessionId}
        instructorName={instructorName}
        lessonTitle={lessonTitle}
        objective={objective}
        keyPoints={keyPoints}
        allImages={allImages}
        videoUrl={videoUrl}
        testMode={testMode}
      >
        {children}
      </LearningLayoutInner>
    </ProgressProvider>
  )
}

function LearningLayoutInner({
  children,
  sessionId,
  instructorName,
  lessonTitle,
  objective,
  keyPoints,
  allImages,
  videoUrl,
  testMode,
}: Omit<LearningLayoutProps, 'initialProgress'>) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const { progress } = useProgress()

  // Filter images for the current activity
  const currentImages = useMemo(() => {
    if (!progress.currentActivityId) {
      return allImages
    }
    return allImages.filter((img) => img.activityId === progress.currentActivityId)
  }, [allImages, progress.currentActivityId])

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-gray-50">
      {/* Toggle button for collapsed left panel */}
      {leftCollapsed && (
        <button
          onClick={() => setLeftCollapsed(false)}
          className="fixed left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-white shadow-md rounded-r-lg border border-l-0 border-gray-200 text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          title="Mostrar panel de aprendizaje"
        >
          <PanelLeft className="h-5 w-5" />
        </button>
      )}

      {/* Left Sidebar */}
      <LearningSidebar
        instructorName={instructorName}
        lessonTitle={lessonTitle}
        objective={objective}
        keyPoints={keyPoints}
        progress={{
          current: progress.current,
          total: progress.total,
          percentage: progress.percentage,
        }}
        isCollapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed(!leftCollapsed)}
      />

      {/* Main Content (Chat) */}
      <main
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          leftCollapsed && rightCollapsed && 'max-w-5xl mx-auto'
        )}
      >
        {testMode && (
          <TestModeBanner
            sessionId={sessionId}
            courseId={testMode.courseId}
            activities={testMode.activities}
          />
        )}
        {children}
      </main>

      {/* Right Panel (Images or Sophia video) */}
      <ImagePanel
        images={currentImages}
        videoUrl={videoUrl}
        isCollapsed={rightCollapsed}
        onToggle={() => setRightCollapsed(!rightCollapsed)}
      />

      {/* Toggle button for collapsed right panel */}
      {rightCollapsed && (
        <button
          onClick={() => setRightCollapsed(false)}
          className="fixed right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-white shadow-md rounded-l-lg border border-r-0 border-gray-200 text-gray-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
          title="Mostrar recursos visuales"
        >
          <PanelRight className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
