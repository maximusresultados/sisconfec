/**
 * useExport — Hook utilitário para exportação de dados
 *
 * Uso:
 *   const { exportCSV } = useExport()
 *   exportCSV('kardex.csv', [
 *     { key: 'created_at', label: 'Data' },
 *     { key: 'type',       label: 'Tipo' },
 *     { key: 'quantity',   label: 'Quantidade' },
 *   ], kardexData)
 */
export function useExport() {
  /**
   * Exporta um array de objetos como CSV (UTF-8 com BOM para Excel).
   *
   * @param {string} filename   - Nome do arquivo (ex: 'relatorio.csv')
   * @param {Array}  columns    - [{ key: 'field', label: 'Header', format?: fn }]
   * @param {Array}  rows       - Array de objetos a exportar
   */
  function exportCSV(filename, columns, rows) {
    const escape = (v) => {
      if (v == null) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const header  = columns.map(c => escape(c.label ?? c.key)).join(',')
    const dataRows = rows.map(row =>
      columns.map(c => {
        const raw = row[c.key]
        const val = c.format ? c.format(raw, row) : raw
        return escape(val)
      }).join(',')
    )

    const csv  = [header, ...dataRows].join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return { exportCSV }
}
