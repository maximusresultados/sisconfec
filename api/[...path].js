/**
 * Vercel Serverless Function — catch-all para todas as rotas /api/*
 *
 * Encaminha as requisições para o app Express do backend.
 * O Express vê a URL original (ex: /api/inventory/entrada) e roteie normalmente.
 */
import app from '../backend/src/index.js'

export default app
