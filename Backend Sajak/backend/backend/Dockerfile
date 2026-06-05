# We use a two-stage build to keep the final Docker image size as small as possible.
# Stage 1 (builder) handles installing system build dependencies and compiling Python packages.
# Stage 2 (runtime) copies only the compiled output, leaving behind heavy development tools.

# ==========================================
# Stage 1: Builder
# ==========================================
FROM python:3.12-slim AS builder

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    libglib2.0-dev \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install dependencies into a specific prefix so they can be easily copied
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ==========================================
# Stage 2: Runtime
# ==========================================
FROM python:3.12-slim

# Install runtime-only system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed Python packages from the builder stage
COPY --from=builder /install /usr/local

# Copy all application source code into /app
COPY . /app

# Create required directories for database and models storage
RUN mkdir -p /app/database /app/models_storage

# Create a non-root user called "appuser", take ownership of /app, and switch to that user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Note on timeout 180: LBPH model loading at session start can be slow with many
# enrolled students. 180 seconds prevents Gunicorn killing the worker mid-load.
CMD gunicorn --bind 0.0.0.0:5000 --workers 2 --timeout 180 "app:create_app()"
