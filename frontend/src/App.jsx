import { useState, useEffect, createContext } from 'react'
import Papa from 'papaparse'
import Login from './components/Login'
import AdminDashboard from './components/admin/AdminDashboard'
import DriverDashboard from './components/driver/DriverDashboard'

export const DataContext = createContext([])

export default function App() {
  const [user, setUser]       = useState(null)
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    Papa.parse('/data/ev_fleet_dataset_weather.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        setData(rows.filter(r => r.Date))
        setLoading(false)
      },
      error: err => {
        setError(err.message)
        setLoading(false)
      },
    })
  }, [])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <h2>EV Fleet Dashboard</h2>
        <p>Loading fleet data, please wait…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-screen">
        <h2 style={{ color: '#dc2626' }}>Failed to load data</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} data={data} />
  }

  // Scope data per role:
  // Admins see only their assigned 10 vehicles/drivers
  // Drivers see only their own records
  const scopedData = user.role === 'admin'
    ? data.filter(r => r.Admin_ID === user.id)
    : data.filter(r => String(r.Driver_ID) === String(user.id))

  return (
    <DataContext.Provider value={scopedData}>
      {user.role === 'admin'
        ? <AdminDashboard user={user} onLogout={() => setUser(null)} />
        : <DriverDashboard user={user} onLogout={() => setUser(null)} />
      }
    </DataContext.Provider>
  )
}
