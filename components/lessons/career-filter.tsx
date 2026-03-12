'use client'

import { useState } from 'react'
import { LessonCard } from './lesson-card'

type LessonWithProgress = {
  id: string
  title: string
  slug: string
  keyPoints: string[]
  order: number
  course: {
    title: string
    slug: string
    careerName: string | null
  }
  status: 'completed' | 'in_progress' | 'not_started'
}

interface CareerFilterProps {
  lessons: LessonWithProgress[]
  careers: { id: string; name: string }[]
  showCareerFilter: boolean
}

export function CareerFilter({ lessons, careers, showCareerFilter }: CareerFilterProps) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null)

  const filteredLessons = selectedCareer
    ? lessons.filter((l) => l.course.careerName === selectedCareer)
    : lessons

  // Group by course
  const courseGroups = filteredLessons.reduce((acc, lesson) => {
    const courseTitle = lesson.course.title
    if (!acc[courseTitle]) {
      acc[courseTitle] = []
    }
    acc[courseTitle].push(lesson)
    return acc
  }, {} as Record<string, LessonWithProgress[]>)

  return (
    <>
      {showCareerFilter && careers.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCareer(null)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              selectedCareer === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {careers.map((career) => (
            <button
              key={career.id}
              onClick={() => setSelectedCareer(career.name)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedCareer === career.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {career.name}
            </button>
          ))}
        </div>
      )}

      {filteredLessons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No hay lecciones disponibles en este momento
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(courseGroups).map(([courseTitle, courseLessons]) => (
            <div key={courseTitle}>
              <h2 className="mb-4 text-2xl font-semibold text-primary">
                {courseTitle}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {courseLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} status={lesson.status} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
