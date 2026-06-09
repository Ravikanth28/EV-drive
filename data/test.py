import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

# =====================================================
# CONFIG
# =====================================================

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

RECORDS_PER_DAY = 5

# =====================================================
# TUNING  ←  adjust these to shape the dataset
# =====================================================

# --- Breakdown probability knobs ---
# Base chance of breakdown on any running trip (default: 0.002)
BREAKDOWN_BASE_PROB   = 0.0005   # lower = fewer breakdowns
# How many time-slots a single breakdown occupies in Workshop
BREAKDOWN_SLOTS_MIN   = 2        # was 5
BREAKDOWN_SLOTS_MAX   = 4        # was 8

# --- Brand expense multiplier (>1.0 = higher expense than baseline) ---
# Tata/Mahindra: budget fleet, low running cost
# Mercedes: luxury — high energy, parts & service cost
BRAND_EXPENSE_MULTIPLIER = {
    "Tata":      1.2,   # ₹50–100 per trip — cheap to run
    "Mahindra":  1.5,   # ₹60–120 per trip — moderate
    "Mercedes":  11.0,  # ₹500–900 per trip — expensive, nearly matches revenue
}

# --- Revenue rate per km per brand ---
# Tata/Mahindra: high utilisation cab fleet, strong profit
# Mercedes: premium fare but almost wiped out by running cost
REVENUE_RATE = {
    "Tata":      30,    # ₹30/km — high-volume profitable
    "Mahindra":  32,    # ₹32/km — slightly higher SUV fare
    "Mercedes":  36,    # ₹36/km — premium, but expense ≈ revenue (break-even)
}

TIME_SLOTS = [
    "08:00:00",
    "11:00:00",
    "14:00:00",
    "17:00:00",
    "20:00:00"
]

# last 3 months + current month till today
END_DATE = datetime.today().date()
START_DATE = END_DATE - timedelta(days=120)

# =====================================================
# VEHICLE SPECS
# =====================================================

VEHICLE_SPECS = {

    "Tata Tiago EV": {
        "brand": "Tata",
        "category": "Hatchback",
        "battery_kwh": 24,
        "range": 285,
        "weight": 1235,
        "motor_kw": 55,
        "max_passengers": 5
    },

    "Tata Punch EV": {
        "brand": "Tata",
        "category": "SUV",
        "battery_kwh": 40,
        "range": 468,
        "weight": 1640,
        "motor_kw": 90,
        "max_passengers": 5
    },

    "Tata Harrier EV": {
        "brand": "Tata",
        "category": "SUV",
        "battery_kwh": 75,
        "range": 538,
        "weight": 2200,
        "motor_kw": 175,
        "max_passengers": 5
    },

    "Mahindra XUV400 EV": {
        "brand": "Mahindra",
        "category": "SUV",
        "battery_kwh": 39.4,
        "range": 456,
        "weight": 1585,
        "motor_kw": 110,
        "max_passengers": 5
    },

    "Mahindra XEV 9e": {
        "brand": "Mahindra",
        "category": "SUV",
        "battery_kwh": 79,
        "range": 656,
        "weight": 2200,
        "motor_kw": 210,
        "max_passengers": 5
    },

    "Mahindra BE 6": {
        "brand": "Mahindra",
        "category": "SUV",
        "battery_kwh": 79,
        "range": 683,
        "weight": 2150,
        "motor_kw": 210,
        "max_passengers": 5
    },

    "Mercedes EQS SUV": {
        "brand": "Mercedes",
        "category": "Luxury SUV",
        "battery_kwh": 122,
        "range": 820,
        "weight": 2810,
        "motor_kw": 265,
        "max_passengers": 7
    },

    "Mercedes EQS": {
        "brand": "Mercedes",
        "category": "Luxury Sedan",
        "battery_kwh": 107.8,
        "range": 857,
        "weight": 2480,
        "motor_kw": 245,
        "max_passengers": 5
    }
}

# =====================================================
# VEHICLE DISTRIBUTION
# =====================================================

VEHICLE_DISTRIBUTION = (
    ["Tata Tiago EV"] * 6 +
    ["Tata Punch EV"] * 5 +
    ["Tata Harrier EV"] * 5 +
    ["Mahindra XUV400 EV"] * 5 +
    ["Mahindra XEV 9e"] * 5 +
    ["Mahindra BE 6"] * 4 +
    ["Mercedes EQS SUV"] * 5 +
    ["Mercedes EQS"] * 5
)

assert len(VEHICLE_DISTRIBUTION) == 40

# =====================================================
# ADMINS
# =====================================================

ADMINS = [
    "A001",
    "A002",
    "A003",
    "A004"
]

# =====================================================
# REVENUE MODEL
# =====================================================

# NOTE: REVENUE_RATE is now defined in the TUNING block above

# =====================================================
# WEATHER
# =====================================================

# Use this only for weather-version dataset

WEATHER_MAP = {
    0: "Rainy",
    1: "Sunny",
    2: "Cloudy",
    3: "Hot"
}

WEATHER_FACTOR = {
    0: 0.85,  # Rainy
    1: 1.00,  # Sunny
    2: 0.93,  # Cloudy
    3: 0.80   # Hot
}

# =====================================================
# DRIVER -> ADMIN ASSIGNMENT
# =====================================================

driver_ids = list(range(1, 41))
random.shuffle(driver_ids)

admin_driver_map = {}

for i, admin in enumerate(ADMINS):
    admin_driver_map[admin] = driver_ids[i*10:(i+1)*10]

driver_admin_lookup = {}

for admin, drivers in admin_driver_map.items():
    for d in drivers:
        driver_admin_lookup[d] = admin

# =====================================================
# VEHICLE STATE CREATION
# =====================================================

def create_vehicle_states():

    vehicle_states = {}

    for i, model in enumerate(VEHICLE_DISTRIBUTION, start=1):

        spec = VEHICLE_SPECS[model]

        vehicle_id = f"EV{i:03d}"

        # Initial odometer
        odometer = random.randint(
            0,
            50000
        )

        # derive cycles from odometer
        charge_cycles = max(
            0,
            int(odometer / 180)
        )

        # battery degradation
        battery_health = max(
            75,
            100 - (charge_cycles // 25)
        )

        vehicle_states[vehicle_id] = {

            "vehicle_id": vehicle_id,

            "model": model,

            "brand": spec["brand"],

            "category": spec["category"],

            "battery_capacity_kwh":
                spec["battery_kwh"],

            "max_range_km":
                spec["range"],

            "vehicle_weight":
                spec["weight"],

            "motor_kw":
                spec["motor_kw"],

            "max_passengers":
                spec["max_passengers"],

            "battery_pct":
                random.randint(55, 100),

            "battery_health":
                battery_health,

            "charge_cycles":
                charge_cycles,

            "odometer":
                odometer,

            "breakdown_records_left": 0,

            "charging_records_left": 0,

            "charging_target": 0
        }

    return vehicle_states

# =====================================================
# DRIVER PROFILES
# =====================================================

def create_driver_profiles():

    profiles = {}

    for driver_id in range(1, 41):

        profiles[driver_id] = {

            "driver_id": driver_id,

            "admin_id":
                driver_admin_lookup[driver_id],

            "charge_threshold":
                random.randint(15, 25)
        }

    return profiles

# =====================================================
# INIT
# =====================================================

vehicle_states = create_vehicle_states()
driver_profiles = create_driver_profiles()

print("Vehicle States:", len(vehicle_states))
print("Drivers:", len(driver_profiles))

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def get_weather():
    weather = random.choice([0, 1, 2, 3])
    return weather, WEATHER_FACTOR[weather]


def get_road_type():
    return random.choices(
        ["City", "Highway", "Mixed"],
        weights=[45, 25, 30]
    )[0]


def get_speed(road_type):

    if road_type == "City":
        return random.randint(25, 90)

    elif road_type == "Highway":
        return random.randint(60, 130)

    return random.randint(40, 110)


def is_overspeed(speed, road_type):

    if road_type == "City":
        return "Yes" if speed > 70 else "No"

    elif road_type == "Highway":
        return "Yes" if speed > 100 else "No"

    else:
        return "Yes" if speed > 90 else "No"


# =====================================================
# PASSENGER LOAD
# =====================================================

def generate_passenger_load(vehicle):

    passenger_count = random.randint(
        1,
        vehicle["max_passengers"]
    )

    avg_weight = random.randint(70, 80)

    total_load = passenger_count * avg_weight

    return passenger_count, total_load


# =====================================================
# DISTANCE GENERATION
# =====================================================

def generate_trip_distance():

    return round(
        random.uniform(10, 80),
        2
    )


# =====================================================
# ENERGY CONSUMPTION
# =====================================================

def calculate_energy_consumption(
        vehicle,
        distance,
        load_weight,
        speed,
        weather_factor):

    base_efficiency = (
        vehicle["battery_capacity_kwh"]
        /
        vehicle["max_range_km"]
    )

    load_factor = (
        1 +
        (
            load_weight
            /
            vehicle["vehicle_weight"]
        ) * 0.15
    )

    speed_factor = 1 + max(
        0,
        (speed - 60)
    ) * 0.003

    energy = (
        distance
        * base_efficiency
        * load_factor
        * speed_factor
        * weather_factor
    )

    return round(energy, 2)


# =====================================================
# BATTERY DROP
# =====================================================

def apply_trip(vehicle,
               distance,
               energy_used):

    battery_drop = (
        energy_used
        /
        vehicle["battery_capacity_kwh"]
    ) * 100

    vehicle["battery_pct"] -= battery_drop

    vehicle["battery_pct"] = max(
        0,
        vehicle["battery_pct"]
    )

    vehicle["odometer"] += distance


# =====================================================
# CHARGING LOGIC
# =====================================================

def start_charging(vehicle):

    vehicle["charging_records_left"] = random.randint(2, 3)

    vehicle["charging_target"] = random.randint(
        70,
        90
    )


def process_charging(vehicle):

    current = vehicle["battery_pct"]

    target = vehicle["charging_target"]

    steps = max(
        1,
        vehicle["charging_records_left"]
    )

    increment = (
        target - current
    ) / steps

    vehicle["battery_pct"] += increment

    vehicle["battery_pct"] = min(
        target,
        vehicle["battery_pct"]
    )

    vehicle["charging_records_left"] -= 1

    if vehicle["charging_records_left"] <= 0:

        vehicle["charge_cycles"] += 1

        if vehicle["charge_cycles"] % 25 == 0:

            vehicle["battery_health"] -= 1

            vehicle["battery_health"] = max(
                70,
                vehicle["battery_health"]
            )

    return round(vehicle["battery_pct"], 2)


# =====================================================
# BREAKDOWN PROBABILITY
# =====================================================

def check_breakdown(vehicle):

    probability = BREAKDOWN_BASE_PROB

    if vehicle["battery_health"] < 90:
        probability += 0.005

    if vehicle["battery_health"] < 85:
        probability += 0.008

    if vehicle["odometer"] > 30000:
        probability += 0.005

    if vehicle["odometer"] > 50000:
        probability += 0.008

    if random.random() < probability:

        vehicle["breakdown_records_left"] = random.randint(
            BREAKDOWN_SLOTS_MIN,
            BREAKDOWN_SLOTS_MAX
        )

        return True

    return False

# =====================================================
# REMAINING RANGE
# =====================================================

def calculate_remaining_range(
        vehicle,
        load_weight,
        speed,
        road_type,
        weather_factor):

    battery_factor = (
        vehicle["battery_pct"]
        / 100
    )

    health_factor = (
        vehicle["battery_health"]
        / 100
    )

    # ------------------------------
    # Load Impact
    # ------------------------------

    load_factor = (
        1 -
        (
            load_weight
            /
            vehicle["vehicle_weight"]
        ) * 0.15
    )

    load_factor = max(
        0.75,
        load_factor
    )

    # ------------------------------
    # Road Type Impact
    # ------------------------------

    if road_type == "City":
        road_factor = 0.95

    elif road_type == "Highway":
        road_factor = 1.02

    else:
        road_factor = 0.98

    # ------------------------------
    # Speed Impact
    # ------------------------------

    speed_factor = max(
        0.70,
        1 - max(0, speed - 60) * 0.003
    )

    # ------------------------------
    # Hidden Driver Efficiency
    # NOT STORED IN DATASET
    # ------------------------------

    driver_efficiency = random.uniform(0.75, 1.25)

    # ------------------------------
    # Base Range
    # ------------------------------

    remaining = (
        vehicle["max_range_km"]
        * battery_factor
        * health_factor
        * load_factor
        * road_factor
        * speed_factor
        * weather_factor
        * driver_efficiency
    )

    # ------------------------------
    # Realistic EV Estimation Error
    # ------------------------------

    estimation_noise = np.random.normal(
        loc=0,
        scale=remaining * 0.10
    )
    battery_temp_factor = random.uniform(
    0.95,
    1.05
)
    remaining *= battery_temp_factor
    remaining += estimation_noise
    

    # ------------------------------
    # Effective Maximum Range
    # Depends on Battery Health
    # ------------------------------

    effective_max_range = (
        vehicle["max_range_km"]
        *
        vehicle["battery_health"]
        / 100
    )

    # ------------------------------
    # Final Bounds
    # ------------------------------

    remaining = max(
        0,
        remaining
    )

    remaining = min(
        remaining,
        effective_max_range
    )

    return round(
        remaining,
        2
    )
# =====================================================
# REVENUE MODEL
# =====================================================

def calculate_revenue(vehicle,
                      distance):

    base_rate = REVENUE_RATE[
        vehicle["brand"]
    ]

    revenue = distance * base_rate

    revenue *= random.uniform(
        0.95,
        1.05
    )

    return round(revenue, 2)


# =====================================================
# EXPENSE MODEL
# =====================================================

def calculate_trip_expense(
        energy_used,
        brand):

    electricity_rate = random.uniform(
        8,
        12
    )

    multiplier = BRAND_EXPENSE_MULTIPLIER.get(brand, 1.0)

    expense = (
        energy_used
        * electricity_rate
        * multiplier
    )

    return round(expense, 2)


# =====================================================
# MAINTENANCE COST
# =====================================================

def generate_maintenance_cost():

    return random.randint(
        1000,
        15000
    )


def generate_ot_maintenance_cost():

    return random.randint(
        500,
        8000
    )


# =====================================================
# VEHICLE STATUS
# =====================================================

def get_vehicle_status(vehicle):

    if vehicle["breakdown_records_left"] > 0:
        return "Workshop"

    if vehicle["charging_records_left"] > 0:
        return "Charging"

    return "Running"

# =====================================================
# WEATHER COLUMN SWITCH
# =====================================================

INCLUDE_WEATHER_COLUMN = True

# =====================================================
# DATE RANGE
# =====================================================

all_dates = pd.date_range(
    start=START_DATE,
    end=END_DATE,
    freq="D"
)

# =====================================================
# DRIVER ↔ VEHICLE MAPPING
# =====================================================

vehicle_ids = list(vehicle_states.keys())

driver_vehicle_map = {}

for driver_id, vehicle_id in zip(
        range(1, 41),
        vehicle_ids):

    driver_vehicle_map[driver_id] = vehicle_id

# =====================================================
# DATASET CREATION
# =====================================================

rows = []

record_id = 1

# =====================================================
# MAIN LOOP
# =====================================================

for current_date in all_dates:

    for driver_id in range(1, 41):

        vehicle_id = driver_vehicle_map[
            driver_id
        ]

        vehicle = vehicle_states[
            vehicle_id
        ]

        profile = driver_profiles[
            driver_id
        ]

        admin_id = profile[
            "admin_id"
        ]

        for slot in TIME_SLOTS:

            weather_code, weather_factor = get_weather()

            status = get_vehicle_status(
                vehicle
            )

            # =========================================
            # WORKSHOP RECORD
            # =========================================

            if status == "Workshop":

                vehicle[
                    "breakdown_records_left"
                ] -= 1

                remaining_range = calculate_remaining_range(
                    vehicle,
                    0,
                    0,
                    "City",
                    weather_factor
                )

                row = {

                    "Record_ID": record_id,

                    "Date": current_date.date(),

                    "Time": slot,

                    "Admin_ID": admin_id,

                    "Driver_ID": driver_id,

                    "Vehicle_ID": vehicle_id,

                    "Brand": vehicle["brand"],

                    "Vehicle_Model":
                        vehicle["model"],

                    "Category":
                        vehicle["category"],

                    "Max_Range_km":
                        vehicle["max_range_km"],

                    "Battery_Capacity_kWh":
                        vehicle["battery_capacity_kwh"],

                    "Vehicle_Weight_kg":
                        vehicle["vehicle_weight"],

                    "Motor_Spec_kW":
                        vehicle["motor_kw"],

                    "Battery_Percentage":
                        round(
                            vehicle["battery_pct"],
                            2
                        ),

                    "Battery_Health_Percentage":
                        vehicle["battery_health"],

                    "Passenger_Count": 0,

                    "Total_Load_Weight_kg": 0,

                    "Road_Type": "N/A",

                    "Vehicle_Status":
                        "Workshop",

                    "Speed_kmph": 0,

                    "Overspeed": "No",

                    "Distance_Travelled_km": 0,

                    "Odometer_km":
                        round(
                            vehicle["odometer"],
                            2
                        ),

                    "Energy_Consumed_kWh": 0,

                    "Charging_Status": "No",

                    "Charge_Cycle_Count":
                        vehicle["charge_cycles"],

                    "Workshop_Visit": "Yes",

                    "Maintenance_Cost":
                        generate_maintenance_cost(),

                    "OT_Maintenance_Cost":
                        generate_ot_maintenance_cost(),

                    "Breakdown": "Yes",

                    "Income_Generated": 0,

                    "Total_Expense":
                        generate_maintenance_cost(),

                    "Remaining_Range_km":
                        remaining_range
                }

                if INCLUDE_WEATHER_COLUMN:
                    row["Weather"] = weather_code

                rows.append(row)

                record_id += 1

                continue

            # =========================================
            # CHARGING RECORD
            # =========================================

            if status == "Charging":

                process_charging(vehicle)

                remaining_range = calculate_remaining_range(
                    vehicle,
                    0,
                    0,
                    "City",
                    weather_factor
                )

                row = {

                    "Record_ID": record_id,

                    "Date": current_date.date(),

                    "Time": slot,

                    "Admin_ID": admin_id,

                    "Driver_ID": driver_id,

                    "Vehicle_ID": vehicle_id,

                    "Brand": vehicle["brand"],

                    "Vehicle_Model":
                        vehicle["model"],

                    "Category":
                        vehicle["category"],

                    "Max_Range_km":
                        vehicle["max_range_km"],

                    "Battery_Capacity_kWh":
                        vehicle["battery_capacity_kwh"],

                    "Vehicle_Weight_kg":
                        vehicle["vehicle_weight"],

                    "Motor_Spec_kW":
                        vehicle["motor_kw"],

                    "Battery_Percentage":
                        round(
                            vehicle["battery_pct"],
                            2
                        ),

                    "Battery_Health_Percentage":
                        vehicle["battery_health"],

                    "Passenger_Count": 0,

                    "Total_Load_Weight_kg": 0,

                    "Road_Type": "N/A",

                    "Vehicle_Status":
                        "Charging",

                    "Speed_kmph": 0,

                    "Overspeed": "No",

                    "Distance_Travelled_km": 0,

                    "Odometer_km":
                        round(
                            vehicle["odometer"],
                            2
                        ),

                    "Energy_Consumed_kWh": 0,

                    "Charging_Status": "Yes",

                    "Charge_Cycle_Count":
                        vehicle["charge_cycles"],

                    "Workshop_Visit": "No",

                    "Maintenance_Cost": 0,

                    "OT_Maintenance_Cost": 0,

                    "Breakdown": "No",

                    "Income_Generated": 0,

                    "Total_Expense": 0,

                    "Remaining_Range_km":
                        remaining_range
                }

                if INCLUDE_WEATHER_COLUMN:
                    row["Weather"] = weather_code

                rows.append(row)

                record_id += 1

                continue

            # =========================================
            # NORMAL TRIP
            # =========================================

            road_type = get_road_type()

            speed = get_speed(
                road_type
            )

            overspeed = is_overspeed(
                speed,
                road_type
            )

            passenger_count, load_weight = (
                generate_passenger_load(
                    vehicle
                )
            )

            distance = generate_trip_distance()

            energy_used = (
                calculate_energy_consumption(
                    vehicle,
                    distance,
                    load_weight,
                    speed,
                    weather_factor
                )
            )

            apply_trip(
                vehicle,
                distance,
                energy_used
            )

            revenue = calculate_revenue(
                vehicle,
                distance
            )

            expense = calculate_trip_expense(
                energy_used,
                vehicle["brand"]
            )

            # =========================================
            # CHARGING TRIGGER
            # =========================================

            if (
                vehicle["battery_pct"]
                <= profile[
                    "charge_threshold"
                ]
            ):
                start_charging(vehicle)

            # =========================================
            # BREAKDOWN CHECK
            # =========================================

            breakdown = check_breakdown(
                vehicle
            )

            workshop = (
                "Yes"
                if breakdown
                else "No"
            )

            maintenance_cost = (
                generate_maintenance_cost()
                if breakdown
                else 0
            )

            ot_cost = (
                generate_ot_maintenance_cost()
                if breakdown
                else 0
            )

            remaining_range = (
                calculate_remaining_range(
                    vehicle,
                    load_weight,
                    speed,
                    road_type,
                    weather_factor
                )
            )

            row = {

                "Record_ID": record_id,

                "Date": current_date.date(),

                "Time": slot,

                "Admin_ID": admin_id,

                "Driver_ID": driver_id,

                "Vehicle_ID": vehicle_id,

                "Brand": vehicle["brand"],

                "Vehicle_Model":
                    vehicle["model"],

                "Category":
                    vehicle["category"],

                "Max_Range_km":
                    vehicle["max_range_km"],

                "Battery_Capacity_kWh":
                    vehicle["battery_capacity_kwh"],

                "Vehicle_Weight_kg":
                    vehicle["vehicle_weight"],

                "Motor_Spec_kW":
                    vehicle["motor_kw"],

                "Battery_Percentage":
                    round(
                        vehicle["battery_pct"],
                        2
                    ),

                "Battery_Health_Percentage":
                    vehicle["battery_health"],

                "Passenger_Count":
                    passenger_count,

                "Total_Load_Weight_kg":
                    load_weight,

                "Road_Type":
                    road_type,

                "Vehicle_Status":
                    "Running",

                "Speed_kmph":
                    speed,

                "Overspeed":
                    overspeed,

                "Distance_Travelled_km":
                    round(
                        distance,
                        2
                    ),

                "Odometer_km":
                    round(
                        vehicle["odometer"],
                        2
                    ),

                "Energy_Consumed_kWh":
                    energy_used,

                "Charging_Status":
                    "No",

                "Charge_Cycle_Count":
                    vehicle["charge_cycles"],

                "Workshop_Visit":
                    workshop,

                "Maintenance_Cost":
                    maintenance_cost,

                "OT_Maintenance_Cost":
                    ot_cost,

                "Breakdown":
                    "Yes"
                    if breakdown
                    else "No",

                "Income_Generated":
                    revenue,

                "Total_Expense":
                    round(
                        expense
                        +
                        maintenance_cost
                        +
                        ot_cost,
                        2
                    ),

                "Remaining_Range_km":
                    remaining_range
            }

            if INCLUDE_WEATHER_COLUMN:
                row["Weather"] = weather_code

            rows.append(row)

            record_id += 1

# =====================================================
# SAVE DATASET
# =====================================================

df = pd.DataFrame(rows)

# Put target last
target = df.pop(
    "Remaining_Range_km"
)

df["Remaining_Range_km"] = target

filename = (
    "ev_fleet_dataset_weather.csv"
    if INCLUDE_WEATHER_COLUMN
    else "ev_fleet_dataset.csv"
)

df.to_csv(
    filename,
    index=False
)

print("=" * 60)
print("Dataset Generated Successfully")
print("Rows :", len(df))
print("Columns :", len(df.columns))
print("File :", filename)
print("=" * 60)

print(df.head())