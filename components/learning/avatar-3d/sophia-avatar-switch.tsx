'use client'

import dynamic from 'next/dynamic'
import { SophiaAvatar } from '@/components/learning/sophia-avatar'
import { featureFlags } from '@/lib/env'

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

interface SophiaAvatarSwitchProps {
  state: AvatarState
  size?: number
  avatarUrl?: string
  /** Fuerza el 3D ignorando el feature flag (para el sandbox /dev/avatar-lab). */
  force3D?: boolean
}

// Carga diferida: Three.js NO entra al bundle principal y NO corre en SSR
// (usa WebGL/window). Mientras carga, se muestra el avatar 2D como fallback.
const SophiaAvatar3D = dynamic(
  () => import('./sophia-avatar-3d').then((m) => m.SophiaAvatar3D),
  {
    ssr: false,
    loading: () => <SophiaAvatar state="idle" size={240} />,
  },
)

/**
 * Selector seguro entre el avatar 2D (producción) y el 3D (experimento).
 *
 * - Feature flag OFF (default) → siempre 2D, idéntico a hoy.
 * - Feature flag ON o force3D   → 3D con carga diferida + fallback.
 *
 * Úsalo como reemplazo drop-in de <SophiaAvatar />.
 */
export function SophiaAvatarSwitch({
  state,
  size = 240,
  avatarUrl,
  force3D = false,
}: SophiaAvatarSwitchProps) {
  const use3D = force3D || featureFlags.enable3DAvatar

  if (!use3D) {
    return <SophiaAvatar state={state} size={size} />
  }

  return <SophiaAvatar3D state={state} size={size} avatarUrl={avatarUrl} />
}
