import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score
import warnings
import pickle

warnings.filterwarnings('ignore')

df = pd.read_csv('ev_fleet_dataset_weather.csv')

features = [
    'Vehicle_Model',
    'Category',
    'Max_Range_km',
    'Battery_Capacity_kWh',
    'Vehicle_Weight_kg',
    'Motor_Spec_kW',
    'Battery_Percentage',
    'Battery_Health_Percentage',
    'Passenger_Count',
    'Total_Load_Weight_kg',
    'Road_Type',
    'Odometer_km',
    'Charge_Cycle_Count',
    'Weather'
]

target = 'Remaining_Range_km'

# Keep only features + target
cols_to_keep = features + [target]

# Drop rows missing the target
df.dropna(subset=[target], inplace=True)

df_clean = df[cols_to_keep].copy()

# Encoding
cat_cols = df_clean.select_dtypes(include=['object', 'category']).columns.tolist()
for col in cat_cols:
    df_clean[col] = df_clean[col].astype('category').cat.codes

# Fill missing values
df_clean.fillna(df_clean.median(numeric_only=True), inplace=True)

X = df_clean[features]
y = df_clean[target]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

rf_model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
rf_model.fit(X_train, y_train)
y_pred_rf = rf_model.predict(X_test)

r2_rf = r2_score(y_test, y_pred_rf)
print(f"R2 Score with specific features: {r2_rf:.4f}")

feat_imp = pd.Series(rf_model.feature_importances_, index=features).sort_values(ascending=False)
print("\nFeature Importances:")
print(feat_imp)

model_path = 'rf_model.pkl'
with open(model_path, 'wb') as f:
    pickle.dump(rf_model, f)
    
print(f"\nModel saved successfully to {model_path}")
