# config/config.py
import os


class Config:
    # Project root directory (where CSV files are located)
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    
    # CSV file paths
    FPL_DATA_CSV = os.path.join(PROJECT_ROOT, 'fpl-data-stats.csv')
    FIXTURE_TEMPLATE_CSV = os.path.join(PROJECT_ROOT, 'fixture_template.csv')
