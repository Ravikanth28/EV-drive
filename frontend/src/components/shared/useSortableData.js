import { useMemo, useState } from 'react'

/**
 * Generic client-side sorting for tabular data.
 *
 * @param {Array<object>} rows           raw rows
 * @param {object}        initial        { key, dir } initial sort ('asc' | 'desc')
 * @param {object}        accessors      optional map of columnKey -> (row) => comparableValue
 * @returns { sorted, sortKey, sortDir, requestSort }
 */
export function useSortableData(rows, initial = {}, accessors = {}) {
  const [sortKey, setSortKey] = useState(initial.key ?? null)
  const [sortDir, setSortDir] = useState(initial.dir ?? 'asc')

  const sorted = useMemo(() => {
    if (!sortKey) return rows
    const get = accessors[sortKey] || (r => r[sortKey])
    const arr = [...rows]
    const isNumeric = v =>
      typeof v === 'number' ||
      (typeof v === 'string' && v.trim() !== '' && /^-?[\d.,]+$/.test(v.trim()))

    arr.sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      let cmp
      if (isNumeric(va) && isNumeric(vb)) {
        cmp = parseFloat(String(va).replace(/,/g, '')) - parseFloat(String(vb).replace(/,/g, ''))
      } else {
        cmp = String(va ?? '').localeCompare(String(vb ?? ''), undefined, { numeric: true })
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [rows, sortKey, sortDir, accessors])

  function requestSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return { sorted, sortKey, sortDir, requestSort }
}
