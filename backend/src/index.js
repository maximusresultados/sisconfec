/**
 * SisConfec — Backend API Auxiliar
 * Node.js + Express
 *
 * Responsabilidades:
 *   - Regras de negócio complexas (preço médio, validação de saldo)
 *   - Geração de relatórios pesados
 *   - Integrações externas (NF-e, etc.) — futuro
 *
 * O Supabase cuida de: auth, storage, real-time, CRUD simples via RLS.
 */
import 'dotenv/config'
import 'express-async-errors'
import express from 'express'
import cors    from 'cors'

import inventoryRoutes from './routes/inventory.js'
import usersRoutes     from './routes/users.js'

const app  = express()
const PORT = process.env.PORT ?? 3001

// ------- MIDDLEWARES GLOBAIS -------
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}))

app.use(express.json())

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
    next()
  })
}

// ------- ROTAS -------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'sisconfec-api' })
})

app.use('/api/inventory', inventoryRoutes)
app.use('/api/users',    usersRoutes)

// ------- TRATAMENTO GLOBAL DE ERROS -------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  // Normaliza o erro — pode ser um Error, um objeto Supabase ou uma string
  const message = (err instanceof Error ? err.message : null)
    ?? err?.message
    ?? (typeof err === 'string' ? err : null)
    ?? 'Erro interno inesperado.'

  const isDev = process.env.NODE_ENV !== 'production'
  console.error('[ERROR]', message, err?.stack ?? '')

  // Erros de negócio conhecidos (lançados explicitamente com new Error())
  // têm stack trace; erros do Supabase são objetos sem stack.
  const isKnownError = err instanceof Error
  const status = isKnownError ? 400 : 500

  res.status(status).json({
    message,
    ...(isDev && err?.stack ? { stack: err.stack.split('\n').slice(0, 4) } : {}),
  })
})

// ------- INICIA SERVIDOR (local) / EXPORTA (Vercel) -------
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`✔  SisConfec API rodando em http://localhost:${PORT}`)
    console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
    console.log(`   Supabase: ${process.env.SUPABASE_URL}`)
  })
}

export default app
