import pandas as pd
import json

file_path = r'c:\Users\EmuPC\Desktop\Proyectos\pros dc\REF\Base de datos DC.xlsx'
try:
    xl = pd.ExcelFile(file_path)
    sheet_data = {}
    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name, nrows=5)
        sheet_data[sheet_name] = {
            "columns": df.columns.tolist(),
            "sample_rows": df.values.tolist()
        }
    print(json.dumps(sheet_data, indent=2))
except Exception as e:
    print(f"Error: {e}")
