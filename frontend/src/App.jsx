import { useState, useEffect, createContext } from 'react'
import Login from './components/Login'
import AdminDashboard from './components/admin/AdminDashboard'
import DriverDashboard from './components/driver/DriverDashboard'
import { supabase } from './utils/supabaseClient'

export const DataContext = createContext([])

// Maps snake_case database columns to expected PascalCase dashboard properties
function mapDbRecordToCsvRecord(db) {
  return {
    Date: db.date,
    Time: db.time,
    Admin_ID: db.admin_id,
    Driver_ID: db.driver_id != null ? String(db.driver_id) : '',
    Vehicle_ID: db.vehicle_id,
    Brand: db.brand,
    Vehicle_Model: db.vehicle_model,
    Category: db.category,
    Max_Range_km: db.max_range_km != null ? String(db.max_range_km) : '',
    Battery_Capacity_kWh: db.battery_capacity_kwh != null ? String(db.battery_capacity_kwh) : '',
    Vehicle_Weight_kg: db.vehicle_weight_kg != null ? String(db.vehicle_weight_kg) : '',
    Motor_Spec_kW: db.motor_spec_kw != null ? String(db.motor_spec_kw) : '',
    Battery_Percentage: db.battery_percentage != null ? String(db.battery_percentage) : '',
    Battery_Health_Percentage: db.battery_health_percentage != null ? String(db.battery_health_percentage) : '',
    Passenger_Count: db.passenger_count != null ? String(db.passenger_count) : '',
    Total_Load_Weight_kg: db.total_load_weight_kg != null ? String(db.total_load_weight_kg) : '',
    Road_Type: db.road_type,
    Vehicle_Status: db.vehicle_status,
    Speed_kmph: db.speed_kmph != null ? String(db.speed_kmph) : '',
    Overspeed: db.overspeed,
    Distance_Travelled_km: db.distance_travelled_km != null ? String(db.distance_travelled_km) : '',
    Odometer_km: db.odometer_km != null ? String(db.odometer_km) : '',
    Energy_Consumed_kWh: db.energy_consumed_kwh != null ? String(db.energy_consumed_kwh) : '',
    Charging_Status: db.charging_status,
    Charge_Cycle_Count: db.charge_cycle_count != null ? String(db.charge_cycle_count) : '',
    Workshop_Visit: db.workshop_visit,
    Maintenance_Cost: db.maintenance_cost != null ? String(db.maintenance_cost) : '',
    OT_Maintenance_Cost: db.ot_maintenance_cost != null ? String(db.ot_maintenance_cost) : '',
    Breakdown: db.breakdown,
    Income_Generated: db.income_generated != null ? String(db.income_generated) : '',
    Total_Expense: db.total_expense != null ? String(db.total_expense) : '',
    Weather: db.weather,
    Remaining_Range_km: db.remaining_range_km != null ? String(db.remaining_range_km) : '',
  }
}

export default function App() {
  const [user, setUser]       = useState(null)
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  // 1. Initial check for active session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        const meta = session.user.user_metadata
        setUser({
          role: meta.role,
          id: meta.user_id,
          name: meta.name,
          email: session.user.email
        })
      } else {
        setLoading(false)
      }
    }).catch((err) => {
      console.error('Session recovery failed:', err)
      setLoading(false)
    })
  }, [])

  // 2. Fetch scoped data whenever user logs in or user details change
  useEffect(() => {
    if (!user) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)

    const fetchScopedData = async () => {
      try {
        let allRows = []
        let from = 0
        let to = 999
        let hasMore = true

        while (hasMore) {
          let query = supabase
            .from('synthetic_ev_records')
            .select('*')
            .range(from, to)

          if (user.role === 'admin') {
            query = query.eq('admin_id', user.id)
          } else {
            query = query.eq('driver_id', Number(user.id))
          }

          const { data: rows, error: dbError } = await query

          if (dbError) {
            throw dbError
          }

          allRows = [...allRows, ...rows]

          if (rows.length < 1000) {
            hasMore = false
          } else {
            from += 1000
            to += 1000
          }
        }

        const mappedRows = allRows.map(mapDbRecordToCsvRecord)
        setData(mappedRows)
      } catch (err) {
        console.error('Data fetch failed:', err)
        setError(err.message || 'Failed to fetch dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchScopedData()
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

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
        <button className="btn-signout" style={{ marginTop: '20px', background: '#3b82f6', color: '#fff' }} onClick={handleLogout}>
          Go to Sign In
        </button>
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={setUser} />
  }

  return (
    <DataContext.Provider value={data}>
      {user.role === 'admin'
        ? <AdminDashboard user={user} onLogout={handleLogout} />
        : <DriverDashboard user={user} onLogout={handleLogout} />
      }
    </DataContext.Provider>
  )
}
