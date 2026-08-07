FROM python:3.12-slim

# crewAI pulls native deps; build-essential covers the common ones.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8100

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS http://localhost:8100/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100"]
