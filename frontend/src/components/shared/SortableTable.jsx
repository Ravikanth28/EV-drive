import { useSortableData } from './useSortableData'

/**
 * Reusable sortable data table.
 *
 * columns: Array<{
 *   key:       string                 // unique column key
 *   label:     ReactNode              // header text
 *   sortable?: boolean                // default true
 *   align?:    'left' | 'right' | 'center'
 *   sortAccessor?: (row) => any       // value used for sorting (defaults to render of row[key])
 *   render?:   (row, index) => ReactNode  // cell content (defaults to row[key])
 *   thStyle?, tdStyle?: object
 * }>
 *
 * rowKey: (row, i) => key
 */
export default function SortableTable({
  columns,
  rows,
  rowKey = (_, i) => i,
  initialSort = {},
  emptyMessage = 'No records found.',
  emptyColSpan,
}) {
  const accessors = {}
  columns.forEach(c => {
    if (c.sortAccessor) accessors[c.key] = c.sortAccessor
  })

  const { sorted, sortKey, sortDir, requestSort } = useSortableData(rows, initialSort, accessors)

  return (
    <table className="data-table">
      <thead>
        <tr>
          {columns.map(col => {
            const sortable = col.sortable !== false
            const active = sortKey === col.key
            return (
              <th
                key={col.key}
                className={sortable ? `sortable${active ? ' active' : ''}` : undefined}
                style={{ textAlign: col.align || 'left', ...col.thStyle }}
                onClick={sortable ? () => requestSort(col.key) : undefined}
                title={sortable ? 'Click to sort' : undefined}
              >
                <span className="th-inner" style={col.align === 'right' ? { flexDirection: 'row-reverse' } : undefined}>
                  {col.label}
                  {sortable && (
                    <span className={`sort-ind${active ? '' : ' dim'}`}>
                      {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  )}
                </span>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td
              colSpan={emptyColSpan || columns.length}
              style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          sorted.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map(col => (
                <td key={col.key} style={{ textAlign: col.align || 'left', ...col.tdStyle }}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
