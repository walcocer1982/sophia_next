'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

type AvatarState = 'idle' | 'listening' | 'speaking' | 'processing'

interface SophiaAvatar3DProps {
  state: AvatarState
  size?: number
  /**
   * URL opcional de un avatar GLB (Ready Player Me / Avaturn / VRoid).
   * Si no se provee, se muestra un placeholder 3D rotando — útil para
   * validar el pipeline de render sin depender de un asset.
   */
  avatarUrl?: string
}

// Color del "estado" — mismo lenguaje visual que el avatar 2D actual.
const STATE_COLOR: Record<AvatarState, number> = {
  idle: 0x94a3b8, // slate
  listening: 0x10b981, // emerald
  speaking: 0x3b82f6, // blue
  processing: 0xf59e0b, // amber
}

const STATE_SPEED: Record<AvatarState, number> = {
  idle: 0.3,
  listening: 0.6,
  speaking: 1.2,
  processing: 0.8,
}

/**
 * Avatar 3D experimental (paso 1 del experimento avatar-3d).
 *
 * Objetivo de este paso: confirmar que Three.js renderiza, encuadra a
 * "medio cuerpo" y no rompe el build. Aún NO incluye lip-sync ni gestos
 * (eso llega en pasos posteriores con TalkingHead).
 *
 * Mantiene la MISMA interfaz que <SophiaAvatar /> (state, size) para ser
 * un reemplazo drop-in detrás del feature flag.
 */
export function SophiaAvatar3D({ state, size = 240, avatarUrl }: SophiaAvatar3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // Guardamos el estado actual en un ref para que el loop de animación
  // (que se crea una sola vez) siempre lea el valor más reciente.
  const stateRef = useRef<AvatarState>(state)
  stateRef.current = state

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // --- Escena ---
    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    // Encuadre "medio cuerpo": cámara a la altura del pecho/cara.
    camera.position.set(0, 1.45, 2.2)
    camera.lookAt(0, 1.3, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    // --- Luces ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.8))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2)
    keyLight.position.set(2, 4, 3)
    scene.add(keyLight)

    // --- Sujeto (placeholder o GLB) ---
    let model: THREE.Object3D
    const placeholderMat = new THREE.MeshStandardMaterial({
      color: STATE_COLOR[stateRef.current],
      roughness: 0.4,
      metalness: 0.1,
    })

    if (avatarUrl) {
      // Carga de GLB real. El placeholder se muestra mientras carga.
      const temp = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.8, 8, 16), placeholderMat)
      temp.position.y = 1.3
      model = temp
      scene.add(model)

      new GLTFLoader().load(
        avatarUrl,
        (gltf) => {
          scene.remove(temp)
          model = gltf.scene
          scene.add(model)
        },
        undefined,
        (err) => console.error('[avatar-3d] error cargando GLB:', err),
      )
    } else {
      // Placeholder: una cápsula (cuerpo) + esfera (cabeza) que rota.
      const group = new THREE.Group()
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.7, 8, 16), placeholderMat)
      body.position.y = 1.1
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), placeholderMat)
      headMesh.position.y = 1.65
      group.add(body, headMesh)
      model = group
      scene.add(model)
    }

    // --- Loop de animación ---
    let raf = 0
    const clock = new THREE.Clock()
    const animate = () => {
      raf = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      const current = stateRef.current

      // Color del material reacciona al estado (solo placeholder).
      placeholderMat.color.setHex(STATE_COLOR[current])

      // Movimiento sutil tipo "respiración" + velocidad según estado.
      const speed = STATE_SPEED[current]
      model.rotation.y = Math.sin(t * speed) * 0.25
      model.position.y = Math.sin(t * speed * 2) * 0.02

      renderer.render(scene, camera)
    }
    animate()

    // --- Cleanup (crítico para no leakear contexto WebGL) ---
    return () => {
      cancelAnimationFrame(raf)
      renderer.dispose()
      placeholderMat.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose()
        }
      })
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [size, avatarUrl])

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: size, height: size }}
    />
  )
}
