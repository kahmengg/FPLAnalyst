# config/config.py
import os

class Config:
    DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')