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
      credentials: {},
      async authorize() {
        // 🔒 Security: Only allow test-user in development environment
        if (process.env.NODE_ENV !== 'development') {
          console.warn('⚠️  Test user login attempt blocked in production')
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: 'user-test@sophia.dev' },
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
        const normalizedEmail = user.email!.toLowerCase()
        const dbUser = await prisma.user.upsert({
          where: { email: normalizedEmail },
          update: {
            name: user.name,
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
          select: { role: true, careerId: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.careerId = dbUser.careerId
        }
        const enrollmentCount = await prisma.enrollment.count({
          where: { userId: user.id },
        })
        token.hasEnrollment = enrollmentCount > 0
        return token
      }

      // On subsequent requests: refresh careerId and hasEnrollment from DB if missing
      if (token.sub && (!token.careerId || !token.hasEnrollment)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { careerId: true },
        })
        if (dbUser?.careerId) {
          token.careerId = dbUser.careerId
        }
        if (!token.hasEnrollment) {
          const enrollmentCount = await prisma.enrollment.count({
            where: { userId: token.sub },
          })
          token.hasEnrollment = enrollmentCount > 0
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        session.user.role = (token.role as string) || 'STUDENT'
        session.user.careerId = (token.careerId as string) || null
        session.user.hasEnrollment = !!token.hasEnrollment
      }
      return session
    },
  },
})
