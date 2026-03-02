# SisConfec — Sistema de Gestão de Confecção

> Sistema web multiusuário para **Gestão de Estoque e Produção de Confecção**, substituindo planilhas Excel por um ambiente rastreável, multi-tenant e seguro.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + Stitches (CSS-in-JS) |
| Backend auxiliar | Node.js + Express |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (JWT) |
| Hospedagem | Vercel (frontend + backend serverless) |

## Módulos

- **Estoque** — Cadastro de tecidos, entradas (com preço médio ponderado) e saídas (Kardex)
- **Produção (Corte)** — Ordens de corte com grade de tamanhos (PP→XGG), execução e revisão de qualidade
- **Facção (Costura)** — Remessas para costureiras externas, controle de retorno e pagamento
- **Relatórios** — Dashboard em tempo real, Kardex por tecido e alertas de estoque mínimo

## Perfis de Acesso (RBAC)

| Role | Acesso |
|------|--------|
| `admin` | Acesso total |
| `estoquista` | Estoque — tecidos e movimentações |
| `encarregado_corte` | Ordens de corte e revisão |
| `gestor_faccao` | Remessas, costureiras e pagamentos |

## Estrutura do Projeto

```
sisconfec/
├── frontend/          # React + Vite + Stitches
│   └── src/
│       ├── lib/       # Supabase client
│       ├── styles/    # Stitches design tokens
│       ├── contexts/  # AuthContext (RBAC)
│       ├── hooks/     # useInventory, etc.
│       ├── components/
│       └── pages/
├── backend/           # Node.js + Express (regras de negócio)
│   └── src/
│       ├── config/    # Supabase Admin client
│       ├── middleware/ # Auth JWT + RBAC
│       ├── routes/    # /api/inventory/*
│       └── services/  # Preço médio ponderado
└── database/
    └── schema.sql     # DDL completo (já aplicado no Supabase)
```

## Configuração

### Frontend

```bash
cd frontend
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### Backend

```bash
cd backend
cp .env.example .env
# Preencha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e SUPABASE_JWT_SECRET
npm install
npm run dev
```

### Variáveis de Ambiente

**Frontend** (`frontend/.env`):
```
VITE_SUPABASE_URL=https://smitijlhrqyfkjxuroxt.supabase.co
VITE_SUPABASE_ANON_KEY=<sua_anon_key>
VITE_API_URL=http://localhost:3001
```

**Backend** (`backend/.env`):
```
PORT=3001
SUPABASE_URL=https://smitijlhrqyfkjxuroxt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<sua_service_role_key>
SUPABASE_JWT_SECRET=<seu_jwt_secret>
```

## Deploy na Vercel

### Frontend
1. Conecte o repositório na Vercel
2. **Root Directory:** `frontend`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Configure as variáveis de ambiente no painel da Vercel

### Backend
1. Adicione `vercel.json` na raiz do `backend/`
2. O Express é adaptado como Serverless Function automaticamente

## Banco de Dados

O schema está em `database/schema.sql` e já foi aplicado no Supabase.

**Tabelas:**
`tenants` · `profiles` · `fabrics` · `inventory_transactions` · `cutting_orders` · `cutting_executions` · `seamstresses` · `faction_dispatches`

**Views:**
`vw_kardex` · `vw_low_stock_alerts` · `vw_faction_summary`

---

Desenvolvido com ❤️ — SisConfec v0.1.0
