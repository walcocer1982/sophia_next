'use client'

import { useCallback } from 'react'
import { t as translate, type Locale, type StringKey } from './strings'

/**
 * Hook simple para traducción en client components. Devuelve la función `t`
 * con el locale fijo, así no hay que pasarlo en cada llamada.
 *
 *   const t = useT(language) // language: 'ES' | 'EN'
 *   t('register_title')
 *   t('session_activity_of', { current: 3, total: 5 })
 */
export function useT(locale: Locale) {
  return useCallback(
    (key: StringKey, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale]
  )
}
