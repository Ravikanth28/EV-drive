// ── Driver name map (ID 1–40 → Indian name) ───────────────────────────────
export const DRIVER_NAMES = {
   1: 'Arjun',      2: 'Pratheeban', 3: 'Harish',    4: 'Ravikanth',
   5: 'Karthik',    6: 'Surya',      7: 'Vishnu',     8: 'Deepak',
   9: 'Manoj',     10: 'Arun',      11: 'Rahul',     12: 'Vikram',
  13: 'Sanjay',    14: 'Naveen',    15: 'Dinesh',    16: 'Suresh',
  17: 'Ramesh',    18: 'Balaji',    19: 'Prashanth', 20: 'Gopal',
  21: 'Anand',     22: 'Rajesh',    23: 'Muthukumar',24: 'Senthil',
  25: 'Ajith',     26: 'Vignesh',   27: 'Ashwin',    28: 'Bharath',
  29: 'Ganesh',    30: 'Lokesh',    31: 'Mohan',     32: 'Nithish',
  33: 'Pavan',     34: 'Rohit',     35: 'Sathish',   36: 'Thilak',
  37: 'Udhay',     38: 'Varun',     39: 'Yashwanth', 40: 'Zubair',
}

export function driverName(id) {
  return DRIVER_NAMES[Number(id)] ?? `Driver ${id}`
}

// ── Date helpers ─────────────────────────────────────────────────────────────
export function getMonthKey(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d)) return null
  return d.toLocaleString('default', { month: 'short', year: '2-digit' })
}

// ── Array helpers ─────────────────────────────────────────────────────────────
export function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const k = typeof keyFn === 'function' ? keyFn(item) : item[keyFn]
    if (k == null) return acc
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

export function sumBy(arr, key) {
  return arr.reduce((s, r) => s + (parseFloat(r[key]) || 0), 0)
}

export function avgBy(arr, key) {
  if (!arr.length) return 0
  return sumBy(arr, key) / arr.length
}

export function countWhere(arr, pred) {
  return arr.filter(pred).length
}

export function uniqueValues(arr, key) {
  return [...new Set(arr.map(r => r[key]).filter(v => v != null && v !== ''))].sort((a, b) =>
    typeof a === 'number' ? a - b : String(a).localeCompare(String(b))
  )
}

// ── Monthly aggregation ───────────────────────────────────────────────────────
// aggFn: 'sum' | 'count' | 'avg' | (rows => number)
export function monthlyAgg(records, valueKeyOrFn, aggFn = 'sum') {
  const byMonth = groupBy(records, r => getMonthKey(r.Date))
  return Object.entries(byMonth)
    .filter(([k]) => k)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, rows]) => {
      const label = getMonthLabel(rows[0].Date)
      let value
      if (typeof aggFn === 'function') {
        value = aggFn(rows)
      } else if (aggFn === 'sum') {
        value = sumBy(rows, valueKeyOrFn)
      } else if (aggFn === 'count') {
        value = rows.length
      } else if (aggFn === 'avg') {
        value = avgBy(rows, valueKeyOrFn)
      }
      return { month: label, value: Math.round((value || 0) * 100) / 100 }
    })
}

// ── Format helpers ────────────────────────────────────────────────────────────
export function fmtNum(n, decimals = 0) {
  return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: decimals })
}

export function fmtCurrency(n) {
  return '₹' + fmtNum(n, 2)
}

// Pie chart fill palette
export const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#dc2626', '#7c3aed', '#0891b2', '#d97706', '#be185d']
