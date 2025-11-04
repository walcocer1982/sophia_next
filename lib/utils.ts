import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nameInitials(fullname: string) {
  // recibe nombre: Bruno Diaz y valida y retorna: BD
  const name = fullname?.trim()
  if (!name) return ''

  const parts = name.split(/\s+/).filter(Boolean)

  const firstLetter = (s: string) => {
    const m = s.match(/\p{L}/u)
    return m ? m[0] : ''
  }

  if (parts.length === 1) {
    // single word: return first two letter characters (if available)
    const letters = Array.from(parts[0]).filter(ch => /\p{L}/u.test(ch))
    return letters.slice(0, 2).join('').toLocaleUpperCase()
  }

  const first = firstLetter(parts[0])
  const last = firstLetter(parts[parts.length - 1])
  return (first + last).toLocaleUpperCase()
}