import { setupServer } from 'msw/node'

// Pas de handler par défaut : chaque test déclare les siens via server.use().
export const server = setupServer()
