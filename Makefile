.PHONY: setup ingest models dashboard cascade agent scheduler sql test clean

setup:
	pip install -r requirements.txt

ingest:
	python -m src.ingestion.opensky_producer --once
	python -m src.ingestion.noaa_weather_producer --once
	python -m src.ingestion.faa_asws_producer --once

models:
	cd src/dbt_project && python run_models.py

dashboard:
	streamlit run src/dashboard/app.py

cascade:
	python -m src.processing.cascade_calculator

agent:
	python -m src.agents.pipeline_health_agent

scheduler:
	python -m src.scheduler

sql:
	@echo "Usage: python run_sql.py 01  (or 02, 03, ... 07)"

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
	rm -rf src/dbt_project/target src/dbt_project/logs
