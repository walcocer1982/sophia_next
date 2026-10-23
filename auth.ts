import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './lib/prisma'

// Log env vars availability at startup (no values, just presence)
console.log('[Auth] ENV check:', {
  GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
  AUTH_SECRET: !!process.env.AUTH_SECRET,
  AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
  DATABASE_URL: !!process.env.DATABASE_URL,
})

// Refresco del usuario (rol, carrera, sede, matrícula) guardado por 60 s. Ver el
// callback `jwt`. En Vercel es por instancia; vale igual: es un refresco, no la
// fuente de verdad.
const REFRESCO_TTL_MS = 60_000
const refrescos = new Map<string, { hasta: number; role: unknown; careerId: unknown; sedeId: unknown; hasEnrollment: unknown }>()

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      id: 'test-user',
      name: 'Test User',
      credentials: { email: { label: 'Email', type: 'text' } },
      async authorize(credentials) {
        // 🔒 Security: Only allow test-user in development environment
        if (process.env.NODE_ENV !== 'development') {
          console.warn('⚠️  Test user login attempt blocked in production')
          return null
        }

        // Alumnos simulados (scripts/cetemin/simular-alumnos.ts, 22 oct 2026):
        // en desarrollo se puede entrar como un correo @simulado.local para que
        // cada alumno ficticio hable con Sophia con su propia sesión y el
        // Monitor los vea en vivo. Cualquier otro correo cae al usuario de prueba.
        const pedido = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const email = pedido.endsWith('@simulado.local') ? pedido : 'user-test@sophia.dev'
        const user = await prisma.user.findUnique({
          where: { email },
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
      if (user && account?.provider === 'google') {
        // Normalize to lowercase: Google sends lowercase but the DB may have
        // a manually-created admin with mixed case. Without this, upsert misses
        // the existing record and creates a duplicate STUDENT account.
        if (!user.email) {
          console.error('[Auth] Google sign-in without email — aborting')
          return token
        }
        const normalizedEmail = user.email.toLowerCase()
        // 23 oct 2026: una cuenta que viene del padrón (tiene DNI) conserva su nombre
        // oficial. Antes cada ingreso lo pisaba con el de Google («Elpinin 9», «nelson»).
        const delPadron = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { dni: true } }).catch(() => null)
        const dbUser = await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {
            ...(delPadron?.dni ? {} : { name: user.name }),
            image: user.image,
            googleId: account.providerAccountId,
          },
          create: {
            email: normalizedEmail,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
            emailVerified: new Date(),
          },
        })

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
        token.role = dbUser.role
        token.careerId = dbUser.careerId
        token.sedeId = dbUser.sedeId
        const enrollmentCount = await prisma.enrollment.count({
          where: { userId: dbUser.id },
        })
        token.hasEnrollment = enrollmentCount > 0
        return token
      }

      if (user) {
        token.sub = user.id
        // Fetch role, careerId and enrollment for credentials provider
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, careerId: true, sedeId: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.careerId = dbUser.careerId
          token.sedeId = dbUser.sedeId
        }
        const enrollmentCount = await prisma.enrollment.count({
          where: { userId: user.id },
        })
        token.hasEnrollment = enrollmentCount > 0
        return token
      }

      // On subsequent requests: refresh role, careerId and hasEnrollment from DB.
      // Refreshing role is critical — a user upgraded from STUDENT to ADMIN in DB
      // would otherwise keep STUDENT in their JWT until logout, silently hiding
      // admin-only UI (planner action buttons, dashboard, etc.).
      if (token.sub) {
        // El refresco se guarda 60 s por usuario: cada página y cada llamada de la
        // lección (el chat, el sondeo de progreso cada pocos segundos) pasaba por
        // acá y pagaba una ida y vuelta a Neon (~200 ms) antes de su propio
        // trabajo. Un cambio de rol tarda hasta un minuto en verse.
        const guardado = refrescos.get(token.sub)
        if (guardado && guardado.hasta > Date.now()) {
          token.role = guardado.role
          token.careerId = guardado.careerId
          token.sedeId = guardado.sedeId
          token.hasEnrollment = guardado.hasEnrollment
          return token
        }
        // Si la base no responde, se conserva el token (firmado) con los datos del
        // último refresco. Sin este try, la excepción invalidaba la sesión y
        // NextAuth borraba la cookie: un corte de segundos de Neon (6 oct 2026)
        // sacó al usuario de la lección y lo mandó al login.
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { role: true, careerId: true, sedeId: true },
          })
          if (dbUser) {
            token.role = dbUser.role
            token.careerId = dbUser.careerId
            token.sedeId = dbUser.sedeId
          }
          if (!token.hasEnrollment) {
            const enrollmentCount = await prisma.enrollment.count({
              where: { userId: token.sub },
            })
            token.hasEnrollment = enrollmentCount > 0
          }
          refrescos.set(token.sub, {
            hasta: Date.now() + REFRESCO_TTL_MS,
            role: token.role,
            careerId: token.careerId,
            sedeId: token.sedeId,
            hasEnrollment: token.hasEnrollment,
          })
        } catch (error) {
          console.warn('⚠️  auth.jwt: no se pudo refrescar el usuario; se mantiene el token', error instanceof Error ? error.message.split('\n').pop() : error)
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = (token.role as string) || 'STUDENT'
        session.user.careerId = (token.careerId as string) || null
        session.user.sedeId = (token.sedeId as string) || null
        session.user.hasEnrollment = !!token.hasEnrollment
      }
      return session
    },
  },
})
