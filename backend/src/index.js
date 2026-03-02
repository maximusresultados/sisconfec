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

// ------- TRATAMENTO GLOBAL DE ERROS -------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack)

  // Erros de negócio (mensagens amigáveis)
  const isBusinessError = err.message && !err.stack?.includes('supabase')
  const status = isBusinessError ? 400 : 500

  res.status(status).json({
    message: isBusinessError ? err.message : 'Erro interno. Tente novamente.',
    ...(process.env.NODE_ENV === 'development' ? { detail: err.message } : {}),
  })
})

// ------- INICIA SERVIDOR -------
app.listen(PORT, () => {
  console.log(`✔  SisConfec API rodando em http://localhost:${PORT}`)
  console.log(`   Ambiente: ${process.env.NODE_ENV ?? 'development'}`)
  console.log(`   Supabase: ${process.env.SUPABASE_URL}`)
})
