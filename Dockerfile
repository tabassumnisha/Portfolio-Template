# Portfolio CMS — standard-library Python server, no pip packages. Build: docker compose up --build -d
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 HOST=0.0.0.0 PORT=8080 DATABASE_PATH=/app/data/portfolio.sqlite3
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --chown=app:app server.py validation.py uploads.py ./
COPY --chown=app:app Project ./Project
COPY --chown=app:app database ./database
RUN mkdir -p /app/data && chown -R app:app /app/data
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/health', timeout=3)"
CMD ["python", "server.py"]
