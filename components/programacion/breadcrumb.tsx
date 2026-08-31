import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface Miga {
  label: string
  href?: string
}

/**
 * Migas de la navegación de Programación. El período va siempre como primera
 * miga clicable: gobierna todo lo que se ve debajo, pero no cuesta un paso
 * porque se entra directo al activo.
 */
export function Migas({ items }: { items: Miga[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-gray-500">
      {items.map((m, i) => (
        <span key={`${m.label}-${i}`} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
          {m.href ? (
            <Link href={m.href} className="hover:text-gray-900 hover:underline">
              {m.label}
            </Link>
          ) : (
            <span className="font-medium text-gray-900">{m.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
