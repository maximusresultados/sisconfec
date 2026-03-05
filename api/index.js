/**
 * Vercel Serverless — entrada única para todas as rotas /api/*
 * O vercel.json redireciona /api/(.*) para cá via rewrite.
 * O Express recebe a URL original e roteia normalmente.
 */
import app from '../backend/src/index.js'

export default app
