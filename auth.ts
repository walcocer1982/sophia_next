import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './lib/prisma'

console.log('Google Config:', {
  clientId: process.env.GOOGLE_CLIENT_ID ? '✓ configurado' : '❌ FALTA',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET
    ? '✓ configurado'
    : '❌ FALTA',
  nextAuthUrl: process.env.NEXTAUTH_URL,
})

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
        // Buscar el user-test en la base de datos
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
      // Al hacer login, guardar el usuario en la BD si es de Google
      if (user && account?.provider === 'google') {
        // Crear o actualizar usuario en la BD
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
