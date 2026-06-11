import { useContext, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Tooltip } from 'recharts'
import { DataContext } from '../../App'
import { fmtCurrency, fmtNum, driverName } from '../../utils/dataUtils'

const API_URL = import.meta.env.VITE_PREDICTION_API_URL || ''
const PREDICTION_URL = import.meta.env.DEV ? '/api/predict' : API_URL

const CATEGORY_OPTIONS = [
  { label: 'Hatchback', value: '0' },
  { label: 'Luxury SUV', value: '1' },
  { label: 'Luxury Sedan', value: '2' },
  { label: 'SUV', value: '3' },
]

const ROAD_OPTIONS = [
  { label: 'City', value: '0' },
  { label: 'Highway', value: '1' },
  { label: 'Mixed', value: '2' },
]

const VEHICLE_STATUS_OPTIONS = [
  { label: 'Charging', value: '0' },
  { label: 'Running', value: '1' },
  { label: 'Workshop', value: '2' },
]

const WEATHER_OPTIONS = [
  { label: 'Rainy', value: '0' },
  { label: 'Sunny', value: '1' },
  { label: 'Cloudy', value: '2' },
  { label: 'Hot', value: '3' },
]

const BINARY_OPTIONS = [
  { label: 'No', value: '0' },
  { label: 'Yes', value: '1' },
]

const HIDDEN_FIELD_DEFAULTS = {
  Vehicle_Status: '1',
  Overspeed: '0',
  Charging_Status: '0',
  Workshop_Visit: '0',
  Breakdown: '0',
  Speed_kmph: '50',
  Distance_Travelled_km: '0',
  Energy_Consumed_kWh: '50',
  Charging_Duration_Hours: '0',
  Maintenance_Cost: '0',
  OT_Maintenance_Cost: '0',
  Income_Generated: '10000',
  Total_Expense: '2000',
  Driver_Safety_Score: '10',
}

const VEHICLE_PROFILE_FIELDS = [
  { key: 'Category', type: 'select', options: CATEGORY_OPTIONS },
  { key: 'Vehicle_Model', type: 'text' },
  { key: 'Max_Range_km', type: 'number', step: '1' },
  { key: 'Battery_Capacity_kWh', type: 'number', step: '0.1' },
  { key: 'Vehicle_Weight_kg', type: 'number', step: '1' },
  { key: 'Motor_Spec_kW', type: 'number', step: '1' },
]

const TRIP_SECTIONS = [
  {
    title: 'Trip inputs',
    fields: [
      { key: 'Battery_Percentage', label: 'Battery %', type: 'number', step: '0.1' },
      { key: 'Battery_Health_Percentage', label: 'Battery Health %', type: 'number', step: '1' },
      { key: 'Passenger_Count', label: 'Passenger Count', type: 'number', step: '1' },
      { key: 'Total_Load_Weight_kg', label: 'Total Load Weight (kg)', type: 'number', step: '1' },
      { key: 'Road_Type', label: 'Road Type', type: 'select', options: ROAD_OPTIONS },
      { key: 'Odometer_km', label: 'Odometer (km)', type: 'number', step: '0.1' },
      { key: 'Weather', label: 'Weather', type: 'select', options: WEATHER_OPTIONS },
    ],
  },
  {
    title: 'Operational flags',
    fields: [
      { key: 'Charge_Cycle_Count', label: 'Charge Cycle Count', type: 'number', step: '1' },
    ],
  },
]

function formatValue(field, value) {
  if (value == null || value === '') return ''
  if (field.type === 'number') return String(value)
  if (field.type === 'text') return String(value)

  const raw = String(value)
  if (field.key === 'Category') {
    return String({ Hatchback: 0, 'Luxury SUV': 1, 'Luxury Sedan': 2, SUV: 3 }[raw] ?? raw)
  }
  if (field.key === 'Road_Type') {
    return String({ City: 0, Highway: 1, Mixed: 2 }[raw] ?? raw)
  }
  if (field.key === 'Vehicle_Status') {
    return String({ Charging: 0, Running: 1, Workshop: 2 }[raw] ?? raw)
  }
  if (field.key === 'Weather') {
    return String(raw)
  }
  return raw
}

function buildDefaults(record) {
  const defaults = { ...HIDDEN_FIELD_DEFAULTS }
  VEHICLE_PROFILE_FIELDS.forEach(field => {
    defaults[field.key] = formatValue(field, record?.[field.key] ?? '') || (field.type === 'select' ? field.options[0].value : '0')
  })
  TRIP_SECTIONS.forEach(section => {
    section.fields.forEach(field => {
      defaults[field.key] = formatValue(field, record?.[field.key] ?? '') || (field.type === 'select' ? field.options[0].value : '0')
    })
  })
  return defaults
}

function buildPayload(record, formState) {
  const payload = buildDefaults(record)
  Object.assign(payload, formState)
  return payload
}

function coercePayload(formState) {
  const payload = {}
  Object.entries(formState).forEach(([key, value]) => {
    const numeric = Number(value)
    payload[key] = Number.isFinite(numeric) ? numeric : value
  })
  return payload
}

function extractPrediction(result) {
  if (result == null) return null
  const candidate =
    result.prediction ??
    result.predicted_range ??
    result.predicted_range_km ??
    result.output ??
    result.result ??
    result.value ??
    (Array.isArray(result.predictions) ? result.predictions[0] : null)
  const numeric = Number(candidate)
  if (Number.isFinite(numeric)) return numeric
  return null
}

function OdometerGauge({ value, maxValue, label }) {
  const safeMax = Math.max(Number(maxValue) || 0, Number(value) || 0, 1)
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeMax)
  const percent = (safeValue / safeMax) * 100
  const dialData = [{ name: 'remaining', value: safeValue, fill: 'url(#odometerFill)' }]

  return (
    <div className="odometer-gauge-wrap">
      <div className="odometer-gauge-meta">
        <span className="prediction-summary-label">Prediction output</span>
        <strong>{label}</strong>
      </div>

      <div className="odometer-gauge-chart">
        <ResponsiveContainer width="100%" height={240}>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={dialData}
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="72%"
          >
            <defs>
              <linearGradient id="odometerFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="45%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#6c8cff" />
              </linearGradient>
            </defs>
            <PolarAngleAxis
              type="number"
              domain={[0, safeMax]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={24}
              background={{ fill: 'rgba(255,255,255,0.05)' }}
              stroke="none"
              isAnimationActive
            />
            <Tooltip
              formatter={v => [`${fmtNum(v, 1)} km`, 'Remaining range']}
              cursor={{ fill: 'rgba(37,99,235,0.04)' }}
              contentStyle={{ background: 'rgba(13,17,27,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e4e7ed', fontSize: 12 }}
              itemStyle={{ color: '#e4e7ed' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <div className="odometer-gauge-center">
          <h2>{`${fmtNum(safeValue, 1)} km`}</h2>
          <p>{`of ${fmtNum(safeMax, 1)} km max range`}</p>
        </div>
      </div>

      <div className="odometer-gauge-scale">
        <span>0 km</span>
        <span>{`${fmtNum(safeMax / 2, 0)} km`}</span>
        <span>{`${fmtNum(safeMax, 0)} km`}</span>
      </div>

      <div className="odometer-gauge-footer">
        <span className="odometer-pill">
          {percent >= 70 ? 'Healthy range' : percent >= 40 ? 'Moderate range' : 'Low range'}
        </span>
        <span className="odometer-percent">{fmtNum(percent, 0)}% of max</span>
      </div>
    </div>
  )
}

export default function RangePredictionTab({ user, latestRecord }) {
  const data = useContext(DataContext)
  const driverId = String(user.id)
  const driverRows = useMemo(() => data.filter(r => String(r.Driver_ID) === driverId), [data, driverId])
  const templateRecord = useMemo(() => {
    const rows = [...driverRows].sort((a, b) => new Date(`${b.Date} ${b.Time || '00:00:00'}`) - new Date(`${a.Date} ${a.Time || '00:00:00'}`))
    return rows[0] || latestRecord || {}
  }, [driverRows, latestRecord])

  const [formState, setFormState] = useState(() => buildDefaults(templateRecord))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setFormState(buildDefaults(templateRecord))
    setResult(null)
    setError('')
  }, [templateRecord])

  const predictedValue = extractPrediction(result)

  function updateField(key, value) {
    setFormState(prev => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setFormState(buildDefaults(templateRecord))
    setResult(null)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    if (!API_URL) {
      setLoading(false)
      setError('Set VITE_PREDICTION_API_URL to your Render Flask endpoint.')
      return
    }

    try {
      const response = await fetch(PREDICTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coercePayload(buildPayload(templateRecord, formState))),
      })

      const contentType = response.headers.get('content-type') || ''
      const body = contentType.includes('application/json') ? await response.json() : await response.text()

      if (!response.ok) {
        throw new Error(typeof body === 'string' ? body : body?.error || `Request failed with status ${response.status}`)
      }

      setResult(body)
    } catch (err) {
      setError(err?.message || 'Prediction request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="prediction-page">
      <div className="page-header">
        <div className="page-header-left">
          <p className="section-title">Range Prediction</p>
          <p className="section-sub">
            Enter the driver-editable inputs from the notebook and send them to the Render Flask API. Vehicle profile fields are auto-filled from the driver’s mapped vehicle record.
          </p>
        </div>
        <div className="page-header-right">
          <button className="prediction-reset-btn" type="button" onClick={handleReset}>
            Reset to latest trip
          </button>
        </div>
      </div>

      <div className="prediction-summary-grid">
        <div className="prediction-summary-card">
          <span className="prediction-summary-label">Driver</span>
          <strong>{driverName(driverId)}</strong>
          <span>#{driverId}</span>
        </div>
        <div className="prediction-summary-card">
          <span className="prediction-summary-label">Vehicle model</span>
          <strong>{templateRecord.Vehicle_Model || '—'}</strong>
          <span>{templateRecord.Vehicle_ID ? `Vehicle ID: ${templateRecord.Vehicle_ID}` : 'Mapped vehicle record'}</span>
        </div>
        <div className="prediction-summary-card">
          <span className="prediction-summary-label">Vehicle details</span>
          <strong>{templateRecord.Brand || templateRecord.Category || '—'}</strong>
          <span>
            {templateRecord.Max_Range_km ? `Max range ${fmtNum(templateRecord.Max_Range_km, 0)} km` : 'Max range not available'}
          </span>
        </div>
      </div>

      <div className="prediction-layout">
        <form className="prediction-form" onSubmit={handleSubmit}>
          {TRIP_SECTIONS.map(section => (
            <section key={section.title} className="prediction-section">
              <h3>{section.title}</h3>
              <div className="prediction-grid">
                {section.fields.map(field => (
                  <label key={field.key} className="prediction-field">
                    <span>{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        className="prediction-input"
                        value={formState[field.key] ?? ''}
                        onChange={e => updateField(field.key, e.target.value)}
                      >
                        {field.options.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="prediction-input"
                        type="number"
                        step={field.step || '1'}
                        value={formState[field.key] ?? ''}
                        onChange={e => updateField(field.key, e.target.value)}
                      />
                    )}
                  </label>
                ))}
              </div>
            </section>
          ))}

          <div className="prediction-actions">
            <button className="prediction-submit-btn" type="submit" disabled={loading}>
              {loading ? 'Predicting...' : 'Predict Remaining Range'}
            </button>
          </div>

          {error && <div className="prediction-error">{error}</div>}
        </form>

        <aside className="prediction-result-panel">
          <div className="prediction-result-card">
            {predictedValue != null ? (
              <OdometerGauge
                value={predictedValue}
                maxValue={templateRecord.Max_Range_km || Math.max(predictedValue * 1.25, 1)}
                label="Live odometer gauge"
              />
            ) : (
              <div className="odometer-empty-state">
                <span className="prediction-summary-label">Prediction output</span>
                <h2>Waiting for input</h2>
                <p>Submit the form to see the predicted remaining range in the gauge.</p>
              </div>
            )}
          </div>

          <div className="prediction-details-card">
            <h4>Vehicle specs</h4>
            <dl>
              <div><dt>Model</dt><dd>{templateRecord.Vehicle_Model || '—'}</dd></div>
              <div><dt>Brand</dt><dd>{templateRecord.Brand || '—'}</dd></div>
              <div><dt>Max range</dt><dd>{templateRecord.Max_Range_km != null ? `${fmtNum(templateRecord.Max_Range_km, 0)} km` : '—'}</dd></div>
              <div><dt>Battery capacity</dt><dd>{templateRecord.Battery_Capacity_kWh != null ? `${fmtNum(templateRecord.Battery_Capacity_kWh, 1)} kWh` : '—'}</dd></div>
              <div><dt>Vehicle weight</dt><dd>{templateRecord.Vehicle_Weight_kg != null ? `${fmtNum(templateRecord.Vehicle_Weight_kg, 0)} kg` : '—'}</dd></div>
              <div><dt>Motor spec</dt><dd>{templateRecord.Motor_Spec_kW != null ? `${fmtNum(templateRecord.Motor_Spec_kW, 0)} kW` : '—'}</dd></div>
            </dl>
          </div>

          <div className="prediction-details-card">
            <h4>Current template values</h4>
            <dl>
              <div><dt>Battery %</dt><dd>{templateRecord.Battery_Percentage ?? '—'}</dd></div>
              <div><dt>Speed</dt><dd>{templateRecord.Speed_kmph ?? '—'} km/h</dd></div>
              <div><dt>Distance</dt><dd>{templateRecord.Distance_Travelled_km ?? '—'} km</dd></div>
              <div><dt>Energy</dt><dd>{templateRecord.Energy_Consumed_kWh ?? '—'} kWh</dd></div>
            </dl>
          </div>

        </aside>
      </div>
    </div>
  )
}