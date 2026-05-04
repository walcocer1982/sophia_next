'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

interface SophiaAvatarProps {
  state: AvatarState
  size?: number
}

export function SophiaAvatar({ state, size = 240 }: SophiaAvatarProps) {
  // Halo color based on state
  const haloConfig = {
    idle: { color: 'rgba(148, 163, 184, 0.3)', scale: 1 },
    listening: { color: 'rgba(16, 185, 129, 0.5)', scale: 1.15 },
    speaking: { color: 'rgba(59, 130, 246, 0.5)', scale: 1.1 },
    processing: { color: 'rgba(245, 158, 11, 0.5)', scale: 1.05 },
  }[state]

  // Avatar animation based on state
  const avatarAnimation = {
    idle: { scale: [1, 1.02, 1] },
    listening: { scale: [1, 1.05, 1] },
    speaking: { scale: [1, 1.04, 1, 1.04, 1] },
    processing: { scale: [1, 1.01, 1] },
  }[state]

  const animationDuration = {
    idle: 4,
    listening: 1.5,
    speaking: 0.6,
    processing: 2,
  }[state]

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer halo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: haloConfig.color,
          filter: 'blur(30px)',
        }}
        animate={{ scale: [haloConfig.scale, haloConfig.scale * 1.1, haloConfig.scale] }}
        transition={{ duration: animationDuration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Inner halo (sharper) */}
      <motion.div
        className="absolute rounded-full border-2"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          borderColor: haloConfig.color.replace('0.5', '0.8').replace('0.3', '0.6'),
        }}
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: animationDuration, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Avatar image */}
      <motion.div
        className="relative rounded-full overflow-hidden bg-[#0a1628] shadow-xl"
        style={{ width: size * 0.85, height: size * 0.85 }}
        animate={avatarAnimation}
        transition={{ duration: animationDuration, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Image
          src="/cetemin-logo.jpg"
          alt="CETEMIN"
          fill
          className="object-cover scale-110"
          priority
        />
      </motion.div>
    </div>
  )
}
