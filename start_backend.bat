@echo off
echo 🚀 Starting FPL Analyst Full Stack Application
echo ================================================

echo.
echo 📦 Installing backend dependencies...
cd backend
pip install -r requirements.txt

echo.
echo 🔄 Starting Flask API server...
echo 🌐 API will be available at: http://localhost:5000
echo 📊 Health check: http://localhost:5000/api/health
echo.
echo ⚠️  Make sure you've exported data from your Jupyter notebook first!
echo    Run the data export cell in fpl.ipynb to generate JSON files.
echo.
echo 🔗 Your React frontend should connect to: http://localhost:5000
echo.

python app.py