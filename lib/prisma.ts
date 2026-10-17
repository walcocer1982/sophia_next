import { PrismaClient } from '@prisma/client'

// Lecturas que se reintentan una vez si Neon corta la conexión. Solo lecturas:
// una escritura cortada a mitad puede haberse aplicado, y repetirla duplicaría
// el mensaje o el intento. (No hay lecturas dentro de $transaction en el
// proyecto; si se agregan, este reintento correría dentro del lote.)
const LECTURAS = new Set(['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'])

/**
 * ¿Se cayó la conexión con la base (y no es un error de la consulta)?
 * P1001: no se alcanza el servidor. P1017: el servidor cerró la conexión.
 * El primero a veces llega como error de inicialización, sin código.
 */
function esCorteDeConexion(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null
  if (!e) return false
  if (e.code === 'P1001' || e.code === 'P1017') return true
  return /Can't reach database server|Server has closed the connection/i.test(e.message ?? '')
}

function crearCliente() {
  return new PrismaClient().$extends({
    query: {
      // Neon corta la conexión unos segundos de vez en cuando (tres veces el
      // 12 oct 2026, una en mitad de una lección). Esos cortes duran menos de
      // un segundo: un reintento a los 400 ms evita el error 500 al alumno.
      async $allOperations({ operation, args, query }) {
        try {
          return await query(args)
        } catch (error) {
          if (!LECTURAS.has(operation) || !esCorteDeConexion(error)) throw error
          console.warn('⚠️  prisma.reintento: corte de conexión en', operation)
          await new Promise((r) => setTimeout(r, 400))
          return query(args)
        }
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prismaConReintento: ReturnType<typeof crearCliente> | undefined
}

// Clave nueva: el servidor de desarrollo guarda el cliente anterior (sin
// reintento) en globalThis.prisma y lo seguiría usando hasta reiniciarse.
export const prisma = globalForPrisma.prismaConReintento ?? crearCliente()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prismaConReintento = prisma
