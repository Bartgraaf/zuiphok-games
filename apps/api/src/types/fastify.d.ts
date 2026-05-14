import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'ADMIN' | 'PLAYER' }
    user: { sub: string; role: 'ADMIN' | 'PLAYER' }
  }
}
