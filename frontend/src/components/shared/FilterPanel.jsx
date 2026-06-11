/**
 * Reusable filter sidebar (inspired by the reference "Filter by" panel).
 * Compose with the exported control primitives below.
 */
export default function FilterPanel({ title = 'Filter by', onReset, children }) {
  return (
    <aside className="filter-panel">
      <div className="filter-panel-head">
        <span className="filter-panel-title">{title}</span>
        {onReset && (
          <button type="button" className="filter-reset" onClick={onReset}>
            Reset all ✕
          </button>
        )}
      </div>
      {children}
    </aside>
  )
}

export function FilterGroup({ label, action, children }) {
  return (
    <div className="filter-group">
      {label && (
        <div className="filter-group-label">
          <span>{label}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

/** Segmented chips — single select (e.g. Any / Per day / Per hour). */
export function FilterChips({ options, value, onChange }) {
  return (
    <div className="chip-row">
      {options.map(opt => {
        const v = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        return (
          <button
            key={v}
            type="button"
            className={`chip${value === v ? ' active' : ''}`}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function FilterToggle({ label, checked, onChange }) {
  return (
    <label className="filter-toggle-row">
      <span>{label}</span>
      <span className="switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="track" />
      </span>
    </label>
  )
}

/** Dual numeric range with a mini histogram (like the price slider in the reference). */
export function FilterRange({ min, max, value, onChange, histogram = [], step = 1, format = v => v, fromLabel = 'From', toLabel = 'To' }) {
  const [lo, hi] = value
  const span = max - min || 1
  const loFrac = (lo - min) / span
  const hiFrac = (hi - min) / span

  return (
    <div>
      {histogram.length > 0 && (
        <div className="range-hist">
          {histogram.map((h, i) => {
            const frac = histogram.length > 1 ? i / (histogram.length - 1) : 0
            const inRange = frac >= loFrac - 1e-6 && frac <= hiFrac + 1e-6
            const peak = Math.max(...histogram, 1)
            return (
              <div
                key={i}
                className={`range-hist-bar${inRange ? ' in' : ''}`}
                style={{ height: `${Math.max((h / peak) * 100, 4)}%` }}
              />
            )
          })}
        </div>
      )}
      <input
        className="range-slider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={hi}
        onChange={e => {
          const nv = Number(e.target.value)
          onChange([Math.min(lo, nv), nv])
        }}
      />
      <div className="range-inputs">
        <div className="range-field">
          <div className="range-field-label">{fromLabel}</div>
          <input
            type="number"
            value={lo}
            min={min}
            max={hi}
            step={step}
            onChange={e => onChange([Number(e.target.value), hi])}
          />
        </div>
        <span className="range-dash">—</span>
        <div className="range-field">
          <div className="range-field-label">{toLabel}</div>
          <input
            type="number"
            value={hi}
            min={lo}
            max={max}
            step={step}
            onChange={e => onChange([lo, Number(e.target.value)])}
          />
        </div>
      </div>
    </div>
  )
}

/** Multi-select checkboxes. value = array of selected keys. */
export function FilterCheckboxGroup({ options, value, onChange }) {
  function toggle(v) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }
  return (
    <div className="check-grid">
      {options.map(opt => {
        const v = typeof opt === 'object' ? opt.value : opt
        const label = typeof opt === 'object' ? opt.label : opt
        return (
          <label key={v} className="check-item">
            <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} />
            {label}
          </label>
        )
      })}
    </div>
  )
}
