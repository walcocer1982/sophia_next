# CLAUDE.md - Guía de Planificación e Implementación

**Proyecto:** Sophia Next
**Arquitectura:** AI-Native Education Platform
**Fecha:** 2025-11-04
**Puerto:** 4000

---

## 🎯 Contexto del Proyecto

**Sophia** es una plataforma educativa que utiliza instructores IA conversacionales (Claude de Anthropic) para crear experiencias de aprendizaje personalizadas. El sistema incluye:

- ✅ Conversación natural con IA especializada
- ✅ Verificación automática de comprensión
- ✅ Progreso granular por actividad
- ✅ Soporte para múltiples intentos de aprendizaje

### Stack Tecnológico

```
Frontend:    Next.js 16.0.1 (App Router) + React 19 + TypeScript + TailwindCSS 4
Backend:     Next.js API Routes
Database:    PostgreSQL (Neon) + Prisma ORM 6.18.0
Auth:        NextAuth v5 beta.30 (JWT strategy)
AI:          Anthropic Claude API
UI:          shadcn/ui + Framer Motion
Deployment:  Vercel
Dev Server:  Puerto 4000 + Turbopack
```

### Arquitectura AI-Native

- **Server Components** por defecto para performance
- **Streaming** de respuestas de IA
- **JSON estructurado** para contenido educativo flexible
- **Type-safe** con TypeScript + Zod

---

## 🗂️ Estructura de Rutas del Proyecto

### Árbol de Directorios `/app`:

```
app/
├── page.tsx                      # Landing page (pública)
├── layout.tsx                    # Root layout con AuthProvider
├── globals.css                   # Estilos globales
│
├── (public)/                     # 🌐 Rutas públicas (sin auth)
│   └── login/
│       └── page.tsx              # Login (Google OAuth + Test User)
│
├── (protected)/                  # 🔒 Rutas protegidas (requieren auth)
│   ├── layout.tsx                # Layout con Navbar
│   └── lessons/
│       ├── page.tsx              # Lista de lecciones
│       └── loading.tsx           # Loading state
│
└── api/
    └── auth/
        └── [...nextauth]/
            └── route.ts          # NextAuth v5 handlers
```

### Clasificación de Rutas:

| Tipo | Ruta | Descripción | Auth Requerida |
|------|------|-------------|----------------|
| 🌐 Pública | `/` | Landing page | ❌ No |
| 🌐 Pública | `/login` | Página de login | ❌ No |
| 🔒 Protegida | `/lessons` | Lista de lecciones | ✅ Sí |
| 🔒 Protegida | `/learn/[lessonId]` | Chat con IA (Fase 2) | ✅ Sí |

**✅ Protección de Rutas:** El proyecto usa `proxy.ts` (Next.js 16) con estrategia de **protección por defecto**. Todas las rutas requieren autenticación EXCEPTO las definidas en `PUBLIC_PATHS` (`/` y `/login`). Esto permite que nuevas rutas en `app/(protected)/` sean protegidas automáticamente sin modificar el proxy.

---

## 📁 Estructura de Carpetas Completa

```
sophia_next/
├── auth.ts                        # ⭐ NextAuth v5 config (RAÍZ)
├── proxy.ts                       # ⭐ Next.js 16 proxy para proteger rutas
├── prisma/
│   ├── schema.prisma             # Schema con 6 modelos
│   └── seed.ts                   # Seed con 2 usuarios + 1 lección
│
├── app/
│   ├── layout.tsx                # Root layout con AuthProvider
│   ├── page.tsx                  # Landing page
│   ├── (public)/login/page.tsx   # Login page
│   ├── (protected)/lessons/page.tsx  # Lessons list
│   └── api/auth/[...nextauth]/route.ts  # Re-exporta handlers
│
├── components/
│   ├── auth/
│   │   └── auth-provider.tsx     # SessionProvider wrapper
│   ├── lessons/
│   │   └── lesson-card.tsx       # Card sin thumbnail
│   ├── navbar.tsx                # Navbar para rutas protegidas
│   └── ui/                       # shadcn/ui components
│
├── lib/
│   └── prisma.ts                 # ⭐ Singleton de Prisma Client
│
├── .env                          # Variables de entorno (NO commitear)
├── .env.example                  # Template
├── package.json                  # Puerto 4000 en scripts
├── tsconfig.json
└── next.config.ts
```

**✅ Limpieza:** El archivo duplicado `lib/auth.ts` fue eliminado. Solo existe `auth.ts` en la raíz.

---

## 🚀 FASE 1: Objetivos (✅ COMPLETADA)

Esta fase establece la fundación del proyecto. Al completarla tendrás:

1. ✅ **Modelo de datos completo** implementado en Prisma (6 tablas, sin thumbnail)
2. ✅ **2 usuarios de prueba** poblados (test@instructoria.dev + user-test)
3. ✅ **Autenticación** con Google OAuth + Test User funcionando
4. ✅ **Vista pública `/lessons`** mostrando lecciones disponibles
5. ✅ **Build exitoso** sin errores

**Duración real:** 2-3 horas

---

## 📋 TAREA 1: Implementar Schema de Prisma

### Objetivo
Crear las 6 tablas del modelo de datos siguiendo `DB_MODEL.md`.

### Archivo: `prisma/schema.prisma`

**Modelos a implementar:**

1. **User** (autenticación + estudiantes)
2. **Account** (OAuth de Google)
3. **Lesson** (contenido educativo) - **⚠️ SIN campo `thumbnail`**
4. **LessonSession** (sesión de aprendizaje + enrollment)
5. **ActivityProgress** (progreso por actividad)
6. **Message** (historial conversacional)

**Puntos clave:**

- `binaryTargets = ["native", "debian-openssl-3.0.x"]` para Vercel
- Campos `Json` para `contentJson`, `images`, `evidenceData`
- Relaciones con `onDelete: Cascade`
- Constraints `@@unique` según DB_MODEL.md
- Índices `@@index` para queries comunes
- **NO incluir** campo `thumbnail` en Lesson (simplificación para Fase 1)

### Comandos a ejecutar:

```bash
# Generar cliente de Prisma
npx prisma generate

# Sincronizar schema con base de datos (desarrollo)
npx prisma db push

# Verificar en GUI
npx prisma studio
```

**Criterio de éxito:** Prisma Studio muestra 6 tablas vacías.

---

## 📋 TAREA 2: Seed Data - 2 Usuarios + 1 Lección

### Objetivo
Poblar la base de datos con 2 usuarios de prueba y 1 lección funcional.

### Archivo: `prisma/seed.ts`

**Contenido a crear:**

1. **Usuario de prueba #1**
   - Email: `test@instructoria.dev`
   - Name: `Usuario de Prueba`

2. **Usuario de prueba #2 (Test User)**
   - ID: `"1000"` (fijo para testing)
   - Email: `user-test@instructoria.dev`
   - Name: `User Test`

3. **Lección: "Fundamentos de Seguridad Web"**
   - Categoría: Ciberseguridad
   - Slug: `seguridad-web-fundamentos`
   - 1 clase, 2 momentos, 3 actividades
   - **⚠️ SIN campo `thumbnail`**

### Código del seed:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // 1. Usuario de prueba #1
  const user = await prisma.user.upsert({
    where: { email: 'test@instructoria.dev' },
    update: {},
    create: {
      email: 'test@instructoria.dev',
      name: 'Usuario de Prueba',
      emailVerified: new Date(),
    },
  })

  console.log('✅ Usuario creado:', user.email)

  // 1.1 Usuario de prueba #2 (Test User con ID fijo)
  const userTest = await prisma.user.upsert({
    where: { id: '1000' },
    update: {},
    create: {
      id: '1000',
      email: 'user-test@instructoria.dev',
      name: 'User Test',
      emailVerified: new Date(),
    },
  })

  console.log('✅ User-test creado:', userTest.email)

  // 2. Lección (ver estructura completa en archivo seed.ts)
  const lesson = await prisma.lesson.upsert({
    where: { slug: 'seguridad-web-fundamentos' },
    update: {},
    create: {
      title: 'Fundamentos de Seguridad Web',
      description: '...',
      slug: 'seguridad-web-fundamentos',
      courseTitle: 'Ciberseguridad Práctica',
      category: 'Ciberseguridad',
      // ⚠️ NO incluir thumbnail
      order: 1,
      estimatedMinutes: 45,
      difficulty: 'básico',
      contentJson: lessonContent,
      isPublished: true,
    },
  })

  console.log('✅ Lección creada:', lesson.title)
  console.log('🎉 Seed completado!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Configurar script en package.json:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### Comandos a ejecutar:

```bash
# Instalar tsx si no existe
npm install -D tsx

# Ejecutar seed
npm run db:seed
```

**Criterio de éxito:** Prisma Studio muestra 2 Users y 1 Lesson con contentJson poblado.

---

## 📋 TAREA 3: NextAuth v5 + Google OAuth

### ⚠️ IMPORTANTE: NextAuth v5 - Cambios Clave

**NextAuth v5 (beta) tiene una arquitectura diferente a v4:**

1. **Archivo de configuración en RAÍZ:** `auth.ts` (no en `lib/auth.ts`)
2. **Variable de entorno:** `AUTH_SECRET` (no `NEXTAUTH_SECRET`)
3. **NEXTAUTH_URL es OPCIONAL:** NextAuth v5 detecta la URL automáticamente
4. **NO usar PrismaAdapter con CredentialsProvider** en JWT strategy

---

### 3.1 Configuración de Google OAuth

**Paso 1:** Ir a [Google Cloud Console](https://console.cloud.google.com)

1. Crear nuevo proyecto o seleccionar existente
2. Habilitar "Google+ API"
3. Credentials → Create Credentials → OAuth 2.0 Client ID
4. Application type: Web application
5. Authorized redirect URIs:
   ```
   http://localhost:4000/api/auth/callback/google
   https://[tu-dominio-vercel]/api/auth/callback/google
   ```
6. Copiar Client ID y Client Secret

---

### 3.2 Variables de Entorno

**Archivo: `.env`**

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# NextAuth v5
# Generate with: openssl rand -base64 32
AUTH_SECRET="tu-secret-generado"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

**Archivo: `.env.example`** (commitear este)

```env
# Database (Neon PostgreSQL)
DATABASE_URL=

# NextAuth v5
# Generate with: openssl rand -base64 32
AUTH_SECRET=

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Generar AUTH_SECRET:

```bash
openssl rand -base64 32
```

**⚠️ Nota Importante:**
- NextAuth v5 usa `AUTH_SECRET` (no `NEXTAUTH_SECRET`)
- `NEXTAUTH_URL` NO es necesaria en NextAuth v5 (se detecta automáticamente)

---

### 3.3 Configuración de NextAuth v5

**Archivo: `auth.ts` (RAÍZ DEL PROYECTO)**

```typescript
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),
    CredentialsProvider({
      id: 'test-user',
      name: 'Test User',
      credentials: {},
      async authorize() {
        // Buscar user-test en BD
        const user = await prisma.user.findUnique({
          where: { id: '1000' },
        })
        if (user) {
          return {
            id: user.id,
            email: user.email!,
            name: user.name,
            image: user.image,
          }
        }
        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Al hacer login con Google, guardar usuario manualmente
      if (user && account?.provider === 'google') {
        const dbUser = await prisma.user.upsert({
          where: { email: user.email! },
          update: {
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          },
          create: {
            email: user.email!,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
            emailVerified: new Date(),
          },
        })

        // Guardar Account
        await prisma.account.upsert({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
          update: {
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | null,
          },
          create: {
            userId: dbUser.id,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state as string | null,
          },
        })

        token.sub = dbUser.id
      }

      if (user) {
        token.sub = user.id
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
```

**⚠️ Por qué NO usar PrismaAdapter:**

- `PrismaAdapter` NO es compatible con `CredentialsProvider` en JWT strategy
- Solución: Manejo manual de usuarios en el callback `jwt` para Google OAuth
- CredentialsProvider funciona sin adapter

---

**Archivo: `lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

### 3.4 Route Handler de NextAuth v5

**Archivo: `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from '@/auth'

export const { GET, POST } = handlers
export const runtime = 'nodejs'
```

**⚠️ Importante:** Solo re-exportar los handlers de `auth.ts` raíz.

---

### 3.5 Auth Provider (Client Component)

**Archivo: `components/auth/auth-provider.tsx`**

```typescript
'use client'

import { SessionProvider } from 'next-auth/react'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

---

### 3.6 Actualizar Root Layout

**Archivo: `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/components/auth/auth-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sophia - Aprende con IA',
  description: 'Plataforma educativa con instructores IA personalizados',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

---

### 3.7 Página de Login

**Archivo: `app/(public)/login/page.tsx`**

```typescript
'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AuroraBackground } from '@/components/ui/aurora-background'
import { Sparkles } from 'lucide-react'
import { Rings } from '@/components/ui/rings'

export default function LoginPage() {
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
          {/* Botón de Google OAuth */}
          <Button
            onClick={() => signIn('google', { callbackUrl: '/lessons' })}
            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
            variant="outline"
          >
            {/* SVG de Google aquí */}
            Continuar con Google
          </Button>

          {/* Botón de Test User */}
          <Button
            onClick={() => signIn('test-user', { callbackUrl: '/lessons' })}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
          >
            🧪 Sign-test (Usuario de Prueba)
          </Button>

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
        </CardContent>
      </Card>
    </AuroraBackground>
  )
}
```

---

### Dependencias necesarias:

```bash
npm install next-auth@beta @auth/prisma-adapter
```

**Criterio de éxito:**
- ✅ `/login` muestra página personalizada con botones
- ✅ Click en "Continuar con Google" inicia OAuth flow
- ✅ Click en "Sign-test" autentica con user-test (ID 1000)
- ✅ Después de login, redirige a `/lessons`
- ✅ Usuario y Account aparecen en Prisma Studio

---

## 📋 TAREA 4: Vista Pública `/lessons`

### Objetivo
Crear una vista que liste todas las lecciones publicadas con cards atractivas.

### 4.1 Componente de Card (sin thumbnail)

**Archivo: `components/lessons/lesson-card.tsx`**

```typescript
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

interface LessonCardProps {
  lesson: {
    id: string
    title: string
    description: string | null
    slug: string
    category: string | null
    estimatedMinutes: number | null
    difficulty: string | null
  }
}

export function LessonCard({ lesson }: LessonCardProps) {
  return (
    <Link href={`/learn/${lesson.id}`}>
      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02]">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center gap-2">
            {lesson.category && (
              <Badge variant="secondary">{lesson.category}</Badge>
            )}
            {lesson.difficulty && (
              <Badge variant="outline">{lesson.difficulty}</Badge>
            )}
          </div>
          <CardTitle className="mb-2">{lesson.title}</CardTitle>
          <CardDescription className="mb-4 line-clamp-2">
            {lesson.description}
          </CardDescription>
          {lesson.estimatedMinutes && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimatedMinutes} minutos</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

**⚠️ Nota:** NO incluye manejo de thumbnail. Se agregará en Fase 4 con sistema de imágenes.

---

### 4.2 Página de Lecciones (Server Component)

**Archivo: `app/(protected)/lessons/page.tsx`**

```typescript
import { prisma } from '@/lib/prisma'
import { LessonCard } from '@/components/lessons/lesson-card'

export default async function LessonsPage() {
  const lessons = await prisma.lesson.findMany({
    where: {
      isPublished: true,
    },
    orderBy: {
      order: 'asc',
    },
    select: {
      id: true,
      title: true,
      description: true,
      slug: true,
      category: true,
      estimatedMinutes: true,
      difficulty: true,
      // ⚠️ NO seleccionar thumbnail
    },
  })

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold">Lecciones Disponibles</h1>
        <p className="text-lg text-muted-foreground">
          Aprende con instructores IA personalizados
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg text-muted-foreground">
            No hay lecciones disponibles en este momento
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

### 4.3 Componentes shadcn/ui necesarios

```bash
npx shadcn@latest add card
npx shadcn@latest add badge
npx shadcn@latest add button
```

**Criterio de éxito:**
- ✅ `/lessons` muestra cards con la lección del seed
- ✅ Card muestra título, descripción, categoría, dificultad, duración
- ✅ Hover effect funciona (scale + shadow)
- ✅ Click lleva a `/learn/[id]` (404 por ahora en Fase 1)

---

## ✅ Criterios de Éxito de Fase 1

Al completar todas las tareas, debes poder verificar:

### Base de Datos
```bash
npx prisma studio
```
- ✅ 6 tablas creadas (User, Account, Lesson, LessonSession, ActivityProgress, Message)
- ✅ 2 Users: test@instructoria.dev + user-test@instructoria.dev (ID 1000)
- ✅ 1 Lesson con contentJson poblado (sin thumbnail)

### Autenticación
- ✅ Navegar a `/login`
- ✅ Click en "Continuar con Google" → OAuth flow
- ✅ Click en "🧪 Sign-test" → Login automático con user-test
- ✅ Login exitoso redirige a `/lessons`
- ✅ Account se crea en tabla Account para Google (verifica en Prisma Studio)

### Vista de Lecciones
- ✅ Navegar a `/lessons`
- ✅ Se muestra 1 card con "Fundamentos de Seguridad Web"
- ✅ Card muestra título, descripción, badges, duración
- ✅ NO muestra thumbnail
- ✅ Hover effect funciona (scale + shadow)

### Build
```bash
npm run build
```
- ✅ Build exitoso sin errores de TypeScript
- ✅ No hay errores de linting

---

## 🎓 Aprendizajes Clave de Fase 1

### NextAuth v5 Beta - Cambios Importantes

1. **Variables de entorno:**
   - ✅ Usar `AUTH_SECRET` (no `NEXTAUTH_SECRET`)
   - ❌ `NEXTAUTH_URL` es OPCIONAL (NextAuth v5 la detecta automáticamente)

2. **Estructura de archivos:**
   - ✅ Configuración en `auth.ts` RAÍZ del proyecto
   - ❌ NO usar `lib/auth.ts` (es redundante)
   - ✅ Route handler solo re-exporta: `export { GET, POST } from '@/auth'`

3. **CredentialsProvider:**
   - ❌ NO compatible con `PrismaAdapter` en JWT strategy
   - ✅ Remover adapter completamente
   - ✅ Manejo manual en callback `jwt` para guardar usuarios de Google

4. **Errores comunes resueltos:**
   - `"no matching decryption secret"` → Falta `AUTH_SECRET` en `.env`
   - `Function.prototype.apply` error → Mezcla de enfoques NextAuth v4/v5
   - `ClientFetchError` → Variables de entorno incorrectas o faltantes

---

### Testing sin OAuth

1. **Usuario de prueba con ID fijo:**
   - Crear usuario con ID predecible (`"1000"`) facilita testing
   - CredentialsProvider busca directamente por ID
   - No requiere password en desarrollo

2. **Patrón útil:**
   ```typescript
   CredentialsProvider({
     id: 'test-user',
     credentials: {},
     async authorize() {
       return await prisma.user.findUnique({ where: { id: '1000' } })
     }
   })
   ```

---

### Decisiones de Simplificación

1. **Sin thumbnails:**
   - Campo `thumbnail` removido de schema para Fase 1
   - Simplifica implementación inicial
   - Se agregará en Fase 4 con sistema completo de imágenes

2. **Puerto 4000:**
   - Usar consistentemente en toda la configuración
   - `package.json`: `"dev": "next dev -p 4000 --turbopack"`
   - ~~NEXTAUTH_URL (opcional)~~

3. **Manejo manual de DB:**
   - En lugar de PrismaAdapter, guardar usuarios en callbacks `jwt`
   - Más control sobre el flujo de autenticación
   - Compatible con CredentialsProvider

---

### Errores Comunes y Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `"no matching decryption secret"` | Falta `AUTH_SECRET` en `.env` | Generar con `openssl rand -base64 32` |
| `Function.prototype.apply error` | Mezcla NextAuth v4/v5 syntax | Usar solo estructura v5 (`auth.ts` raíz) |
| `ClientFetchError` | Variables de entorno incorrectas | Verificar `AUTH_SECRET` + Google credentials |
| `redirect_uri_mismatch` (Google) | URL de callback incorrecta en Google Cloud | Usar `http://localhost:4000/api/auth/callback/google` |

---

## 🎓 Aprendizajes Clave de Fase 2 (MVP-1 Chat)

### NextAuth v5 - Bug Crítico JWT token.sub

**Problema identificado:**
En NextAuth v5 con JWT strategy + Google OAuth, el callback `jwt` tiene un bug sutil donde `token.sub` se sobrescribe con el ID de Google en lugar del ID de la base de datos.

**Causa raíz:**
```typescript
// ❌ BUG: Dos if statements consecutivos
async jwt({ token, user, account }) {
  if (user && account?.provider === 'google') {
    const dbUser = await prisma.user.upsert({ ... })
    token.sub = dbUser.id  // ✅ Correcto: DB ID
  }

  if (user) {
    token.sub = user.id  // ❌ SOBRESCRIBE con Google ID
  }

  return token
}
```

**Solución:**
```typescript
// ✅ FIX: Early return después de Google OAuth
async jwt({ token, user, account }) {
  if (user && account?.provider === 'google') {
    const dbUser = await prisma.user.upsert({ ... })
    token.sub = dbUser.id
    return token  // ⭐ Early return previene sobrescritura
  }

  // Solo se ejecuta para CredentialsProvider
  if (user) {
    token.sub = user.id
  }

  return token
}
```

**Aprendizaje clave:**
- El objeto `user` en el callback `jwt` proviene del **provider** (Google), no de tu base de datos
- Cuando usas OAuth + JWT strategy, DEBES hacer early return después de guardar en DB
- El segundo `if (user)` solo debe ejecutarse para CredentialsProvider

**Referencias:**
- [auth.ts:92-93](auth.ts#L92-L93) - Implementación correcta con early return

---

### React 19 - Errores de Hidratación SSR

**Problema:**
```
Hydration failed because the server rendered text didn't match the client
```

**Causa:**
`Date.prototype.toLocaleTimeString()` sin locale explícito genera diferentes formatos en servidor vs cliente:
```typescript
// ❌ PROBLEMA
{timestamp.toLocaleTimeString()}
// Servidor (OS): "3:18:10 PM"
// Cliente (Browser): "3:18:10 p.m."
// → Mismatch → Hydration error
```

**Solución:**
```typescript
// ✅ FIX: Locale explícito y consistente
const formattedTime = timestamp
  ? new Date(timestamp).toLocaleTimeString('es-PE', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  : ''

{formattedTime}
// Servidor: "3:18 p. m."
// Cliente: "3:18 p. m."
// → Match perfecto ✅
```

**Aprendizaje clave:**
- SIEMPRE especificar locale en funciones de formato de fecha/hora para SSR
- Pre-computar valores antes del render para evitar diferencias server/client
- Usar locale del proyecto (`es-PE` para Peru según CLAUDE.md)

**Referencias:**
- [chat-message.tsx:14-20](components/learning/chat-message.tsx#L14-L20) - Implementación correcta

---

### Seguridad - Protección de Usuarios de Testing en Producción

**Problema:**
CredentialsProvider con user de testing (`test-user`) disponible en producción es un riesgo de seguridad.

**Solución: Doble validación (Backend + Frontend)**

**1. Backend - Bloqueo en `authorize()`:**
```typescript
CredentialsProvider({
  id: 'test-user',
  async authorize() {
    // 🔒 Bloquear en producción
    if (process.env.NODE_ENV !== 'development') {
      console.warn('⚠️  Test user login attempt blocked in production')
      return null
    }
    // ... resto del código solo en development
  }
})
```

**2. Frontend - Ocultar UI:**
```typescript
export default function LoginPage() {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <>
      <Button onClick={handleGoogleSignIn}>Google</Button>

      {/* Solo mostrar en development */}
      {isDevelopment && (
        <Button onClick={handleTestUserSignIn}>
          🧪 Test User
        </Button>
      )}
    </>
  )
}
```

**Aprendizaje clave:**
- Doble validación (backend + frontend) para máxima seguridad
- Backend previene requests directos a API
- Frontend mejora UX ocultando opciones no disponibles
- El provider puede existir en ambos ambientes, solo cambia su comportamiento

**Ventajas de este enfoque vs archivo separado:**
- ✅ No rompe NextAuth (providers no se pueden agregar dinámicamente)
- ✅ No requiere archivos de configuración duplicados
- ✅ Más simple de mantener
- ✅ Auditable con logs

**Referencias:**
- [auth.ts:17-21](auth.ts#L17-L21) - Validación backend
- [login/page.tsx:74-102](app/(public)/login/page.tsx#L74-L102) - Conditional rendering

---

### Decisiones de Arquitectura de Rutas

**Pregunta:** ¿`/learn/{sessionId}` o `/lesson/{sessionId}`?

**Respuesta: `/learn/` es mejor** ✅

**Razones:**

1. **Semántica del verbo:**
   - `/learn/` = **acción en progreso** → "estoy aprendiendo"
   - `/lesson/` = **sustantivo estático** → "ver información"

2. **Mapeo mental:**
   - Usuario hace click → "voy a aprender" (activo)
   - `/learn/` transmite experiencia interactiva
   - `/lesson/` suena read-only

3. **Consistencia industria:**
   - Duolingo: `/learn`
   - Khan Academy: `/learn/`
   - Coursera: `/learn/course-name`

4. **Estructura REST:**
   ```
   /lessons              → Lista (sustantivo plural)
   /lessons/{id}         → Detalles (sustantivo singular)
   /learn/{sessionId}    → Experiencia activa (verbo)
   ```

**Aprendizaje clave:**
- Usar **verbos** para experiencias interactivas (`/learn`, `/practice`, `/play`)
- Usar **sustantivos** para recursos estáticos (`/lessons`, `/courses`, `/users`)
- Consultar convenciones de plataformas similares

---

## 🔐 Variables de Entorno Requeridas

### `.env` (NO commitear)

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/sophia?sslmode=require"

# NextAuth v5
# Generate with: openssl rand -base64 32
AUTH_SECRET="tu-secret-generado-con-openssl"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcdefghijklmnop"
```

### `.env.example` (SÍ commitear)

```env
# Database (Neon PostgreSQL)
DATABASE_URL=

# NextAuth v5
# Generate with: openssl rand -base64 32
AUTH_SECRET=

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

**⚠️ Nota:** `NEXTAUTH_URL` NO es necesaria en NextAuth v5 (se elimina de la documentación).

---

## 🛠️ Comandos Útiles

### Desarrollo

```bash
# Instalar dependencias
npm install

# Generar Prisma Client
npx prisma generate

# Sincronizar schema con DB (desarrollo)
npx prisma db push

# Ejecutar seed
npm run db:seed

# Abrir Prisma Studio (GUI)
npx prisma studio

# Iniciar servidor de desarrollo (puerto 4000)
npm run dev

# Build de producción
npm run build

# Verificar tipos
npx tsc --noEmit

# Linting
npm run lint
```

### Prisma

```bash
# Reset completo de base de datos (¡cuidado!)
npx prisma migrate reset

# Crear migración (producción)
npx prisma migrate dev --name init

# Aplicar migraciones (producción)
npx prisma migrate deploy
```

---

## 📚 Notas Técnicas Importantes

### NextAuth v5

- ✅ **Configuración en raíz** - `auth.ts` en root del proyecto
- ✅ **JWT Strategy por defecto** - No necesita tabla Session
- ✅ **Manejo manual** en lugar de PrismaAdapter para compatibilidad con CredentialsProvider
- ✅ **Session callback** agrega `user.id` al objeto session
- ⚠️ **Beta** - Usa `next-auth@beta` en npm

### Prisma

- ✅ **Singleton pattern** en `lib/prisma.ts` evita múltiples instancias
- ✅ **JSON fields** para `contentJson` permiten estructura flexible
- ✅ **Cascade deletes** limpian datos relacionados automáticamente
- ⚠️ **db push vs migrate** - Usa `db push` en desarrollo, `migrate` en producción

### Next.js 16 + Turbopack

- ✅ **Server Components** por defecto - Fetch directo de Prisma sin API route
- ✅ **Client Components** solo cuando necesitas interactividad (mark con `'use client'`)
- ✅ **Puerto 4000** - Configurado en `package.json`
- ✅ **Turbopack** - Builds más rápidos en desarrollo
- ✅ **proxy.ts** - Reemplaza middleware.ts en Next.js 16, runtime nodejs
- ⚠️ **No usar `useEffect` para fetch** - Usa server components

### TypeScript

- ✅ **Prisma genera tipos** automáticamente con `npx prisma generate`
- ✅ **Select específico** en queries para mejor performance y type safety
- ✅ **Zod schemas** para validar JSON (implementar en futuras fases)

### Performance

- ✅ **Index en campos frecuentes** (`userId`, `lessonId`, etc.)
- ✅ **Select solo campos necesarios** en queries de Prisma
- ✅ **Image optimization** con next/image (cuando se agreguen thumbnails en Fase 4)
- ✅ **Suspense boundaries** para loading states

---

## 🔄 Protocolos de Trabajo

### 📋 Protocolo Plan Mode

**Cuándo usar:**
- Antes de implementar una nueva feature
- Al explorar el codebase
- Para investigar problemas complejos
- Cuando hay múltiples enfoques posibles

**Pasos:**

1. **Investigación con Task Tool:**
   ```
   - Usar Task tool con subagent_type="Plan"
   - Explorar archivos relevantes
   - Buscar patrones existentes
   - Identificar dependencias
   ```

2. **Leer archivos existentes:**
   ```
   - Usar Read tool para ver implementación actual
   - Buscar con Glob/Grep para encontrar referencias
   - No asumir estructura, verificar siempre
   ```

3. **Presentar plan completo:**
   ```
   - Usar ExitPlanMode con plan detallado
   - Incluir archivos a crear/modificar
   - Explicar decisiones de diseño
   - Mencionar trade-offs
   ```

4. **Esperar aprobación:**
   ```
   - NO hacer cambios hasta que usuario apruebe
   - Responder preguntas de clarificación
   - Ajustar plan según feedback
   ```

**Ejemplo de uso:**
```
Usuario: "Implementa sistema de chat con IA"
Claude: [Usa Task tool Plan para explorar]
Claude: [Presenta plan con ExitPlanMode]
Usuario: [Aprueba o ajusta]
Claude: [Comienza implementación]
```

---

### ✏️ Protocolo Edit Mode

**Cuándo usar:**
- Durante implementación activa
- Después de plan aprobado
- Para fixes rápidos
- Al completar tareas del TODOS.md

**Pasos:**

1. **Actualizar TODOS.md en tiempo real:**
   ```
   - Usar TodoWrite al iniciar tarea
   - Marcar como "in_progress" ANTES de empezar
   - Actualizar al completar (no batch)
   - Agregar nuevas tareas descubiertas
   ```

2. **⚠️ IMPORTANTE - Flujo de Commits:**
   ```
   ❌ NO hacer git add/commit automáticamente
   ❌ NO asumir que el usuario quiere commitear inmediatamente

   ✅ Implementar los cambios completos
   ✅ Informar al usuario qué se implementó
   ✅ ESPERAR confirmación del usuario antes de commit
   ✅ Usuario probará la implementación primero

   Solo cuando el usuario diga "haz el commit" o "commitea":
   - git add -A
   - git commit con mensaje descriptivo
   - Usar formato: "feat:", "fix:", "refactor:", etc.
   ```

3. **🚨 CRÍTICO - Prevenir Errores de TypeScript en Producción:**

   **PROBLEMA:** TypeScript en producción (Vercel build) es MÁS ESTRICTO que en desarrollo local.
   Errores que funcionan en `npm run dev` pueden FALLAR en `npm run build`.

   **SOLUCIÓN OBLIGATORIA antes de CADA push/deploy:**

   ```bash
   # 1. SIEMPRE verificar tipos antes de push
   npx tsc --noEmit

   # 2. SIEMPRE hacer build de producción antes de push
   npm run build

   # 3. Verificar linting
   npm run lint
   ```

   **Estrategia para componentes con Prisma:**

   ```typescript
   // ❌ MAL: TypeScript no puede inferir el tipo en .map()
   const lessons = await prisma.lesson.findMany({
     select: { id: true, title: true }
   })
   lessons.map((lesson) => <Card lesson={lesson} />)  // Error: implicit 'any'

   // ✅ BIEN: Tipo explícito con cast
   type LessonWithDetails = {
     id: string
     title: string
     // ... todos los campos del select
   }

   const lessons = await prisma.lesson.findMany({
     select: { id: true, title: true }
   }) as LessonWithDetails[]

   lessons.map((lesson) => <Card lesson={lesson} />)  // ✅ Tipo inferido correctamente
   ```

   **Reglas:**
   - ✅ SIEMPRE agregar type annotation explícito cuando uses Prisma select con .map()
   - ✅ SIEMPRE ejecutar `npm run build` antes de push/deploy
   - ✅ SIEMPRE ejecutar `npx tsc --noEmit` antes de push/deploy
   - ❌ NUNCA confiar solo en `npm run dev` (dev mode es más permisivo)
   - ❌ NUNCA pushear sin verificar build local primero

   **Checklist pre-push obligatorio:**
   ```
   [ ] npx tsc --noEmit (sin errores)
   [ ] npm run build (sin errores)
   [ ] npm run lint (sin errores)
   [ ] Probado en navegador (funciona)
   [ ] Git add + commit
   [ ] Git push
   ```

4. **Verificar build después de cambios:**
   ```bash
   npm run build   # Después de cambios importantes
   npx tsc --noEmit  # Verificar tipos
   npm run lint    # Verificar linting
   ```

4. **Probar funcionalidad:**
   ```
   - Probar en navegador antes de marcar completo
   - Verificar en Prisma Studio (cambios de DB)
   - Revisar console para errores
   - Confirmar rutas funcionan
   ```

5. **Marcar como completado:**
   ```
   - Solo marcar "completed" cuando FUNCIONA
   - Si hay errores, mantener "in_progress"
   - Crear nueva tarea si se descubre bloqueador
   ```

**Ejemplo de flujo correcto:**
```typescript
// 1. Actualizar TODO
TodoWrite([
  {content: "Implementar chat UI", status: "in_progress", ...},
  {content: "Integrar Claude API", status: "pending", ...}
])

// 2. Implementar
Write("components/chat/chat-interface.tsx", ...)

// 3. Marcar completado
TodoWrite([
  {content: "Implementar chat UI", status: "completed", ...},
  {content: "Integrar Claude API", status: "pending", ...}
])

// 4. Informar al usuario
"✅ He implementado el chat UI en components/chat/chat-interface.tsx
Los cambios están listos para probar. Puedes verificar en http://localhost:4000/chat

Cuando confirmes que funciona correctamente, dime 'haz el commit' para crear el commit."

// 5. ESPERAR respuesta del usuario
// Usuario prueba...
// Usuario: "funciona bien, haz el commit"

// 6. Solo entonces hacer commit
git add -A
git commit -m "feat: implement chat UI component"
```

---

### 🚨 Protocolo de Manejo de Errores

**Cuando encuentres errores:**

1. **Identificar categoría:**
   ```
   - Error de tipos (TypeScript)
   - Error de build (Next.js)
   - Error de runtime (console/logs)
   - Error de DB (Prisma)
   - Error de auth (NextAuth)
   ```

2. **Buscar en aprendizajes:**
   ```
   - Revisar sección "Errores Comunes" arriba
   - Verificar variables de entorno
   - Confirmar estructura de archivos
   ```

3. **Debuggear sistemáticamente:**
   ```bash
   # Ver logs completos
   npm run dev

   # Ver estado de DB
   npx prisma studio

   # Verificar tipos
   npx tsc --noEmit

   # Ver variables de entorno
   echo $AUTH_SECRET
   ```

4. **Documentar solución:**
   ```
   - Si encuentras nuevo error, agregarlo a TODOS.md
   - Anotar en comentarios la solución
   - Actualizar esta sección de CLAUDE.md si es recurrente
   ```

---

### 🚀 Protocolo de Release (Pre-Commit)

**Objetivo:** Garantizar calidad del código antes de commitear. Este protocolo es OBLIGATORIO antes de cada commit.

**Cuándo ejecutar:**
- Usuario solicita "haz el commit" o "commitea"
- Antes de cualquier push a repositorio
- Después de completar una feature/fix

**Pasos obligatorios:**

**1. Análisis exhaustivo de cambios:**
```bash
# Ver todos los archivos modificados
git status

# Ver diff de todos los cambios
git diff

# Revisar archivos staged
git diff --cached
```

**2. Limpieza de código:**
```
✅ Verificar y eliminar:
- console.log() de debugging
- console.warn() temporales
- console.error() redundantes
- Comentarios //TODO temporales
- Comentarios de debugging
- Código comentado no usado
- Imports no utilizados

⚠️ MANTENER (no eliminar):
- Logs de seguridad (⚠️  warnings importantes)
- Logs de auditoría (❌ errores críticos)
- Comments de documentación
- Comments de tipo // @ts-ignore con justificación
- TODOs con contexto de MVP futuro
```

**3. Verificación de calidad:**
```bash
# Paso 1: Verificar tipos TypeScript
npx tsc --noEmit

# Paso 2: Build de producción
npm run build

# Paso 3: Linting
npm run lint

# Todos deben pasar sin errores ✅
```

**4. Análisis de archivos modificados:**
```
Para cada archivo en git status:

✅ Verificar:
- Cambios intencionales y relevantes
- Sin cambios accidentales (whitespace, formatting)
- Sin credenciales hardcodeadas
- Sin variables de entorno expuestas
- Sin datos sensibles

❌ Excluir de commit:
- Archivos de configuración local (.env)
- Archivos temporales (*.log, *.tmp)
- Archivos de IDE (.vscode/settings.json personal)
- node_modules o archivos de build
```

**5. Generar mensaje de commit:**
```
Formato: <type>: <description>

Types:
- feat: Nueva funcionalidad
- fix: Corrección de bug
- refactor: Refactorización sin cambio funcional
- perf: Mejora de performance
- style: Cambios de formato (no afectan código)
- docs: Solo documentación
- test: Agregar o modificar tests
- chore: Mantenimiento (deps, config, etc)

Reglas del mensaje:
- Presente imperativo: "add" no "added"
- Primera letra minúscula
- Sin punto final
- Máximo 72 caracteres en primera línea
- Describir QUÉ y POR QUÉ, no CÓMO

Ejemplos:
✅ feat: add chat interface with AI streaming
✅ fix: resolve hydration error in chat timestamps
✅ refactor: extract auth logic to separate module
❌ feat: Added new chat (mal: pasado, capitalizado)
❌ fix: fixed bug (mal: no descriptivo)
```

**6. Crear commit:**
```bash
# Stage todos los cambios relevantes
git add <files>

# Commit con mensaje descriptivo
git commit -m "type: description"

# Verificar commit
git log -1 --stat
```

**Checklist pre-commit (copiar y completar):**
```
[ ] git status ejecutado y analizado
[ ] git diff revisado línea por línea
[ ] console.log() de debugging eliminados
[ ] Comentarios temporales limpiados
[ ] npx tsc --noEmit pasa sin errores
[ ] npm run build pasa sin errores
[ ] npm run lint pasa sin errores
[ ] Funcionalidad probada en navegador
[ ] Mensaje de commit descriptivo y claro
[ ] Solo archivos relevantes en stage
```

**Ejemplo de flujo completo:**
```bash
# Usuario: "haz el commit"

# 1. Análisis
git status
git diff

# 2. Limpieza (si necesaria)
# - Remover console.log en chat-interface.tsx
# - Eliminar comment temporal en auth.ts

# 3. Verificación
npx tsc --noEmit  # ✅ Sin errores
npm run build     # ✅ Build exitoso
npm run lint      # ✅ Sin warnings

# 4. Stage y commit
git add auth.ts components/learning/chat-interface.tsx app/(public)/login/page.tsx
git commit -m "feat: add test-user auth protection and fix hydration error"

# 5. Confirmar
git log -1 --stat
```

**Errores comunes a evitar:**
- ❌ Commitear sin ejecutar build
- ❌ Dejar console.log() de debugging
- ❌ Commit con mensaje genérico ("fix", "update")
- ❌ Incluir archivos no relacionados en el commit
- ❌ Commitear código que no funciona
- ❌ Ignorar warnings de TypeScript/ESLint

---

## 🚀 Filosofía de Desarrollo Incremental

### Principio: Deploy Early, Deploy Often

El proyecto Sophia sigue un enfoque de **MVPs incrementales desplegables**. Cada fase se divide en múltiples MVPs donde cada uno:

1. ✅ Es testeable end-to-end
2. ✅ Es desplegable a producción
3. ✅ Agrega valor real al usuario
4. ✅ Tiene rollback plan claro

### Sacrificios Estratégicos

**Concepto clave:** Es aceptable sacrificar elegancia por velocidad en MVPs tempranos, SIEMPRE que:

- ✅ El sacrificio esté documentado
- ✅ Haya un plan claro para pagarlo
- ✅ No comprometa seguridad
- ✅ No acumule más de 1 MVP de deuda técnica

**Ejemplos de sacrificios aceptables:**

```typescript
// ❌ MVP-1: Hardcoded pero funcional
const systemPrompt = `Eres un instructor de ${lesson.title}. Responde preguntas del estudiante.`

// ✅ MVP-3: Complejo pero correcto
const systemPrompt = buildSystemPrompt({
  lesson,
  activity: getCurrentActivity(contentJson),
  history: last10Messages,
  guardrails: activeGuardrails
})
```

```typescript
// ❌ MVP-1: Response completa (usuario espera 5s)
const response = await fetch('/api/chat', { method: 'POST', ... })
const { message } = await response.json()
// Usuario ve respuesta completa después de esperar

// ✅ MVP-2: Streaming (usuario ve texto aparecer)
const stream = await fetch('/api/chat/stream', { method: 'POST', ... })
for await (const chunk of stream) { /* show chunk */ }
// Usuario ve progreso inmediato
```

### Reglas de Deuda Técnica

1. **Documentar siempre:**
   ```typescript
   // TODO: MVP-3 - Replace with dynamic prompt builder
   // Current: Hardcoded simple prompt
   // Reason: Ship fast, iterate later
   const prompt = `Simple hardcoded prompt...`
   ```

2. **Pagar en siguiente MVP:**
   - MVP-1 genera deuda → MVP-2 paga
   - MVP-2 genera deuda → MVP-3 paga
   - NO acumular deuda más de 1 MVP

3. **Nunca sacrificar:**
   - ❌ Seguridad (auth, encryption, input validation)
   - ❌ Data integrity (transactions, constraints)
   - ❌ User data (privacy, GDPR compliance)

### Ciclo de MVP

```
┌─────────────────────────────────────────────────┐
│ MVP-N Planning (2h)                             │
│ - Definir features mínimas                     │
│ - Identificar sacrificios aceptables           │
│ - Escribir criterios de éxito                  │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Implementation (6-8h)                     │
│ - Build features core                          │
│ - Hardcode lo no-crítico                       │
│ - Test end-to-end                              │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Deployment (30min)                        │
│ - Deploy to staging                            │
│ - Quick smoke tests                            │
│ - Deploy to production                         │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-N Validation (2-4h)                         │
│ - Gather user feedback                         │
│ - Monitor errors/performance                   │
│ - Identify what to improve                     │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│ MVP-(N+1) Planning                              │
│ - Pagar deuda técnica de MVP-N                 │
│ - Agregar features nuevas                      │
│ - Repetir ciclo                                │
└─────────────────────────────────────────────────┘
```

### Ejemplo Real: Fase 2 Chat

**MVP-1: Chat Básico (6-8h)**
- ✅ POST /api/chat (respuesta completa, NO streaming)
- ✅ UI simple funcional
- ❌ Sin streaming (sacrificio: wait time 5-10s)
- ❌ Prompt hardcoded (sacrificio: no personalización)
- **Desplegable:** ✅ Usuario puede chatear
- **Deuda:** Streaming + dynamic prompts

**MVP-2: Streaming + UX (4-6h)**
- ✅ Convertir a SSE streaming
- ✅ Typing indicator
- ✅ Pago de deuda: Streaming implementado
- ❌ Prompt aún hardcoded (acceptable short-term)
- **Desplegable:** ✅ UX como ChatGPT
- **Deuda:** Dynamic prompts + progression

**MVP-3: Production Ready (6-8h)**
- ✅ Dynamic prompt builder
- ✅ Activity progression
- ✅ Rate limiting
- ✅ Pago de TODA la deuda técnica
- ❌ Sin sacrificios
- **Desplegable:** ✅ Production-ready completo
- **Deuda:** Zero (listo para Fase 3)

### Criterios de MVP Exitoso

**Antes de marcar MVP como completo:**

1. ✅ **Funcionalidad core works 100%**
   - Todos los happy paths funcionan
   - No crashes en casos comunes
   - Datos se guardan correctamente

2. ✅ **Es desplegable sin breaking production**
   - Tiene feature flags si necesario
   - Rollback plan documentado
   - No depende de features no desplegadas

3. ✅ **Agrega valor real**
   - Usuario puede completar flujo específico
   - Mejora UX o agrega feature tangible
   - No es "work in progress" visible

4. ✅ **Deuda técnica documentada**
   - TODOs con contexto
   - Plan claro para pagar en siguiente MVP
   - No compromete seguridad/integridad

### Cuando NO usar MVPs

❌ **No usar enfoque MVP para:**

1. Security features (implement correctly first time)
2. Data migrations (must be bulletproof)
3. Payment processing (no room for "good enough")
4. Legal/compliance features (must be complete)

✅ **Usar enfoque MVP para:**

1. UI/UX improvements
2. New features
3. Performance optimizations
4. Developer experience

### Feature Flags para Control

```typescript
// lib/env.ts
export const featureFlags = {
  enableStreaming: process.env.ENABLE_STREAMING === 'true',
  enableActivityProgression: process.env.ENABLE_ACTIVITY_PROGRESSION === 'true',
  enableRateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
}

// Uso en código:
if (featureFlags.enableStreaming) {
  return streamResponse(...)
} else {
  return fullResponse(...) // MVP-1 fallback
}
```

**Ventajas:**
- ✅ Toggle features sin redeploy
- ✅ Rollback inmediato si hay problemas
- ✅ A/B testing fácil
- ✅ Gradual rollout a usuarios

---

## 📋 Plan de Fases

### ✅ Fase 1: Fundación (COMPLETADA)

- Schema de 6 modelos con Prisma
- NextAuth v5 + Google OAuth + Test User
- Vista de lecciones con cards
- proxy.ts para protección de rutas
- Seed con 1 lección de ejemplo

**Estado:** ✅ 100% completa y desplegada

---

### 🚧 Fase 2: Sistema de Chat con IA (PRÓXIMA)

**Ver documento completo:** [`PLAN_FASE2_CHAT.md`](./PLAN_FASE2_CHAT.md)

**Enfoque:** 3 MVPs incrementales desplegables

**MVP-1: Chat Básico (6-8h)**
- Crear sesión de lección
- Chat con respuesta completa (sin streaming)
- Historial persiste
- Prompt simple hardcoded

**MVP-2: Streaming + UX (4-6h)**
- SSE streaming
- Typing indicator
- Auto-scroll inteligente
- Optimistic updates

**MVP-3: Production Ready (6-8h)**
- Lesson content parser
- Activity progression automática
- Verificación de respuestas con IA
- Rate limiting (10 msg/min)
- Monitoring y logging

**Tiempo total:** 16-22 horas (realista)

---

### 🔮 Fase 3: Verificación y Progreso (FUTURO)

- Dashboard de progreso del estudiante
- Tracking granular por actividad
- Analytics avanzados
- Métricas de aprendizaje

---

### 🔮 Fase 4: Features Avanzadas (FUTURO)

- Reintentos de lecciones (sessionAttempt)
- Sistema de imágenes educativas
- Resúmenes automáticos de sesiones
- Gamification y achievements

---

## 📞 Soporte

Si encuentras errores durante la implementación:

1. Verifica que todas las variables de entorno estén configuradas (`AUTH_SECRET` es obligatoria)
2. Ejecuta `npx prisma generate` después de cambios en schema
3. Revisa logs de consola para errores específicos
4. Verifica en Prisma Studio que los datos se están creando correctamente

**Errores comunes:**

- `PrismaClient is unable to run in this browser environment` → Estás importando Prisma en client component
- `Cannot find module '@prisma/client'` → Ejecuta `npx prisma generate`
- `Invalid prisma.X.Y() invocation` → Verifica que el schema esté sincronizado con DB
- `"no matching decryption secret"` → Genera y agrega `AUTH_SECRET` a `.env`

---

## 🛡️ Protección de Rutas con proxy.ts (Next.js 16)

### Estrategia: Protección por Defecto

**Concepto:** En lugar de especificar qué rutas proteger, especificamos qué rutas son **públicas**. Todo lo demás requiere autenticación automáticamente.

**Ventajas:**
- ✅ Escalable: Nuevas rutas quedan protegidas sin modificar código
- ✅ Seguro: Default es "protegido", no "público"
- ✅ Mantenible: Solo agregas a `PUBLIC_PATHS` lo que debe ser público
- ✅ Compatible con route groups: Cualquier ruta en `app/(protected)/` funciona automáticamente

### Implementación Actual:

**Archivo:** `proxy.ts` (raíz del proyecto)

```typescript
import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Lista de rutas públicas que NO requieren autenticación
const PUBLIC_PATHS = [
  '/',        // Landing page
  '/login',   // Página de login
]

export async function proxy(request: NextRequest) {
  const session = await auth()
  const { pathname } = request.nextUrl

  // Verificar si es una ruta pública
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  // Si NO es ruta pública y NO hay sesión → Redirect a login
  if (!isPublicPath && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si intenta ir a /login pero ya está autenticado → Redirect a /lessons
  if (pathname === '/login' && session) {
    const callbackUrl = request.nextUrl.searchParams.get('callbackUrl')
    return NextResponse.redirect(
      new URL(callbackUrl || '/lessons', request.url)
    )
  }

  return NextResponse.next()
}
```

### Comportamiento de Rutas:

| Ruta | Protección | Comportamiento |
|------|-----------|----------------|
| `/` | 🌐 Pública | Acceso libre (en `PUBLIC_PATHS`) |
| `/login` | 🌐 Pública | Redirect a /lessons si autenticado (en `PUBLIC_PATHS`) |
| `/lessons` | 🔒 Protegida | Redirect a /login si no autenticado (default) |
| `/learn/*` | 🔒 Protegida | Redirect a /login si no autenticado (default) |
| **Cualquier nueva ruta** | 🔒 Protegida | Protegida por defecto (default) |

### Agregar Rutas Públicas:

Si necesitas una nueva ruta pública, simplemente agrégala al array:

```typescript
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/about',      // Nueva ruta pública
  '/pricing',    // Nueva ruta pública
]
```

### Diferencias con middleware.ts:

- ✅ **Nombre:** `proxy.ts` (no `middleware.ts`)
- ✅ **Función exportada:** `proxy()` (no `middleware()`)
- ✅ **Runtime:** `nodejs` por defecto (no Edge)
- ✅ **Next.js 16:** Nueva convención oficial
- ⚠️ **Edge no soportado:** Solo Node.js runtime

### Archivos de Autenticación:

- ✅ `auth.ts` (raíz) - Configuración principal de NextAuth v5
- ✅ `proxy.ts` (raíz) - Protección de rutas Next.js 16
- ✅ `lib/prisma.ts` - Singleton de Prisma Client
- ❌ ~~`lib/auth.ts`~~ - Eliminado (duplicado)

---

**Última actualización:** 2025-11-05
**Estado:** Fase 1 completada + proxy.ts implementado para protección de rutas
