import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      careerId?: string | null
      hasEnrollment?: boolean
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}
