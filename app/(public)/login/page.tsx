'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { Sparkles, Loader2 } from 'lucide-react'
import { Rings } from '@/components/ui/rings'
import { GoogleIcon } from '@/components/icons'

export default function LoginPage() {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isTestUserLoading, setIsTestUserLoading] = useState(false)
  const isDevelopment = process.env.NODE_ENV === 'development'

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/lessons' })
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setIsGoogleLoading(false)
    }
  }

  const handleTestUserSignIn = async () => {
    setIsTestUserLoading(true)
    try {
      await signIn('test-user', { callbackUrl: '/lessons' })
    } catch (error) {
      console.error('Error signing in with test user:', error)
      setIsTestUserLoading(false)
    }
  }

  return (
    <AuroraBackground>
      <Card className="w-full max-w-md shadow-lg z-10 bg-white/40 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16 bg-instructor-100 rounded-full flex items-center justify-center">
            <Sparkles className="size-4 text-black" />
            <Rings size={60} />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Sophia
          </CardTitle>
          <CardDescription className="text-base">
            Aprendizaje impulsado por IA para todos
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isTestUserLoading}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
            variant="outline"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <GoogleIcon className="w-5 h-5 mr-3" />
            )}
            {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
          </Button>

          {/* 🔒 Test user only available in development */}
          {isDevelopment && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Solo para desarrollo
                  </span>
                </div>
              </div>

              <Button
                onClick={handleTestUserSignIn}
                disabled={isGoogleLoading || isTestUserLoading}
                className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
              >
                {isTestUserLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  '🧪 Sign-test (Usuario de Prueba)'
                )}
              </Button>
            </>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground">
                Seguro y confiable
              </span>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>Al continuar, aceptas nuestros</p>
            <p>
              <a href="#" className="text-instructor-600 hover:underline">
                Términos de Servicio
              </a>
              {' y '}
              <a href="#" className="text-instructor-600 hover:underline">
                Política de Privacidad
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </AuroraBackground>
  )
}
