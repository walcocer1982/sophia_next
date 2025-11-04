"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface RingsProps {
  size?: number; // Tamaño en px (default: 40)
  speed?: "slow" | "regular" | "fast" | "faster"; // Velocidad de animación
  color?: "black" | "blue" | "green" | "orange"; // Color de los anillos
  className?: string;
}

/**
 * Anillos orbitales animados - Componente UI agnóstico
 * Puede usarse para avatares, botones de carga, indicadores, etc.
 *
 * Props:
 * - size: Tamaño del contenedor (default: 40px)
 * - speed: Velocidad de rotación (slow, regular, fast, faster)
 * - color: Color de los anillos (black, blue, green, orange)
 */
export function Rings({
  size = 40,
  speed = "regular",
  color = "black",
  className
}: RingsProps) {
  // Configuración de velocidades
  const speedConfig = {
    slow: { outer: 5, primary: 4, secondary: 6, accent: 5.5 },
    regular: { outer: 3, primary: 2.5, secondary: 4, accent: 3.5 },
    fast: { outer: 2, primary: 1.6, secondary: 2.5, accent: 2.2 },
    faster: { outer: 1.5, primary: 1.2, secondary: 2, accent: 1.8 }
  };

  // Configuración de colores
  const colorConfig = {
    black: {
      light: "0, 0, 0",         // Negro en modo claro
      dark: "255, 255, 255"     // Blanco en modo oscuro
    },
    blue: {
      light: "59, 130, 246",    // Azul
      dark: "96, 165, 250"
    },
    green: {
      light: "34, 197, 94",     // Verde
      dark: "74, 222, 128"
    },
    orange: {
      light: "251, 146, 60",    // Naranja
      dark: "251, 191, 36"
    }
  };

  // Configuración de opacidades por color
  const opacityConfig = {
    black: { base: 0.8, accent: 0.5 },
    blue: { base: 0.9, accent: 0.7 },
    green: { base: 0.85, accent: 0.6 },
    orange: { base: 0.7, accent: 0.5 }
  };

  // Obtener configuraciones activas
  const durations = speedConfig[speed];
  const colors = colorConfig[color];
  const opacities = opacityConfig[color];

  return (
    <motion.div
      className={cn("absolute pointer-events-none", className)}
      style={{
        width: size,
        height: size,
      }}
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 4,
        repeat: Number.POSITIVE_INFINITY,
        ease: [0.4, 0, 0.6, 1],
      }}
    >
      {/* Light mode rings */}
      {/* Outer elegant ring with shimmer */}
      <motion.div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, rgb(${colors.light}) 90deg, transparent 180deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)`,
          opacity: opacities.base * 0.95,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.outer,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />

      {/* Primary animated ring with gradient */}
      <motion.div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, rgb(${colors.light}) 120deg, rgba(${colors.light}, 0.5) 240deg, transparent 360deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)`,
          opacity: opacities.base,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.primary,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      />

      {/* Secondary elegant ring - counter rotation */}
      <motion.div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background: `conic-gradient(from 180deg, transparent 0deg, rgba(${colors.light}, 0.6) 45deg, transparent 90deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)`,
          opacity: opacities.accent * 0.7,
        }}
        animate={{
          rotate: [0, -360],
        }}
        transition={{
          duration: durations.secondary,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      />

      {/* Accent particles */}
      <motion.div
        className="absolute inset-0 rounded-full dark:hidden"
        style={{
          background: `conic-gradient(from 270deg, transparent 0deg, rgba(${colors.light}, 0.4) 20deg, transparent 40deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)`,
          opacity: opacities.accent,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.accent,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />

      {/* Dark mode rings */}
      {/* Outer elegant ring with shimmer */}
      <motion.div
        className="absolute inset-0 rounded-full hidden dark:block"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, rgb(${colors.dark}) 90deg, transparent 180deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 35%, black 37%, black 39%, transparent 41%)`,
          opacity: opacities.base * 0.95,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.outer,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />

      {/* Primary animated ring with gradient */}
      <motion.div
        className="absolute inset-0 rounded-full hidden dark:block"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, rgb(${colors.dark}) 120deg, rgba(${colors.dark}, 0.5) 240deg, transparent 360deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 42%, black 44%, black 48%, transparent 50%)`,
          opacity: opacities.base,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.primary,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      />

      {/* Secondary elegant ring - counter rotation */}
      <motion.div
        className="absolute inset-0 rounded-full hidden dark:block"
        style={{
          background: `conic-gradient(from 180deg, transparent 0deg, rgba(${colors.dark}, 0.6) 45deg, transparent 90deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 52%, black 54%, black 56%, transparent 58%)`,
          opacity: opacities.accent * 0.7,
        }}
        animate={{
          rotate: [0, -360],
        }}
        transition={{
          duration: durations.secondary,
          repeat: Number.POSITIVE_INFINITY,
          ease: [0.4, 0, 0.6, 1],
        }}
      />

      {/* Accent particles */}
      <motion.div
        className="absolute inset-0 rounded-full hidden dark:block"
        style={{
          background: `conic-gradient(from 270deg, transparent 0deg, rgba(${colors.dark}, 0.4) 20deg, transparent 40deg)`,
          mask: `radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)`,
          WebkitMask: `radial-gradient(circle at 50% 50%, transparent 61%, black 62%, black 63%, transparent 64%)`,
          opacity: opacities.accent,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: durations.accent,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}
