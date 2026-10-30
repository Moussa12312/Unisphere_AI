# ==========================================================
# UniSphere AI - Backend Django Dockerfile
# Production-ready Python Django & DRF Container
# ==========================================================

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p uploads/logos uploads/courses uploads/documents uploads/profiles \
             uploads/messages uploads/incidents uploads/certificates uploads/materials \
             uploads/student_documents uploads/temp_scans uploads/dossier_etudiant qr_codes static

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["gunicorn", "unisphere_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
