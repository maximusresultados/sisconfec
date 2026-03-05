/**
 * Cache em memória para resultados de queries Supabase.
 *
 * - Persiste durante toda a sessão (navegação entre páginas não refaz queries).
 * - Cada entrada expira após TTL (padrão: 60 s).
 * - Mutações chamam `invalidate(prefix)` para forçar refetch na próxima visita.
 *
 * Padrão de uso nos hooks:
 *   const cached = qc.get(key)
 *   if (cached) return cached          // retorno instantâneo
 *   const data = await supabase...
 *   qc.set(key, data)
 *   return data
 *
 *   // após mutation:
 *   qc.invalidate('fabrics:')          // apaga todas as chaves com esse prefixo
 */

const store = new Map()

/** Retorna os dados armazenados se ainda válidos; null caso contrário. */
export function get(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.exp) { store.delete(key); return null }
  return entry.data
}

/** Armazena dados com TTL em milissegundos (padrão: 60 s). */
export function set(key, data, ttlMs = 60_000) {
  store.set(key, { data, exp: Date.now() + ttlMs })
}

/** Remove todas as entradas cujas chaves começam com `prefix`. */
export function invalidate(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}
