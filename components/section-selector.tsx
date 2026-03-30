'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, Users, Loader2 } from 'lucide-react'

interface SectionOption {
  id: string
  name: string
  period: { id: string; name: string }
  course: { id: string; title: string }
  _count: { enrollments: number }
}

interface SectionSelectorProps {
  grouped: Record<string, Record<string, SectionOption[]>>
  existingEnrollments: string[] // sectionIds already enrolled
}

export function SectionSelector({ grouped, existingEnrollments }: SectionSelectorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set(existingEnrollments))

  async function enrollInSection(sectionId: string) {
    setLoading(sectionId)
    try {
      const res = await fetch('/api/user/enroll-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al matricularse')
        return
      }
      setEnrolled(prev => new Set([...prev, sectionId]))
      toast.success(`Matriculado en ${data.sectionName}`)
    } finally {
      setLoading(null)
    }
  }

  function goToLessons() {
    router.push('/lessons')
  }

  const hasEnrollments = enrolled.size > 0

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([periodName, courses]) => (
        <div key={periodName}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Periodo {periodName}
          </h2>

          {Object.entries(courses).map(([courseTitle, sections]) => (
            <Card key={courseTitle} className="p-4 mb-3">
              <h3 className="font-medium text-gray-900 mb-3">{courseTitle}</h3>
              <div className="space-y-2">
                {sections.map(section => {
                  const isEnrolled = enrolled.has(section.id)
                  const isLoading = loading === section.id

                  return (
                    <button
                      key={section.id}
                      onClick={() => !isEnrolled && enrollInSection(section.id)}
                      disabled={isEnrolled || isLoading}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                        isEnrolled
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-gray-800">{section.name}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <Users className="h-3 w-3" /> {section._count.enrollments} estudiantes
                        </span>
                      </div>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : isEnrolled ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <span className="text-xs text-blue-600 font-medium">Seleccionar</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      ))}

      {hasEnrollments && (
        <Button onClick={goToLessons} className="w-full">
          Continuar a mis lecciones
        </Button>
      )}
    </div>
  )
}
