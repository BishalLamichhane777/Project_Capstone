# Backend Sajak/backend/backend/Dockerfile

# Stage 1 (builder)
FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxrender-dev \
    libglib2.0-dev \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# Pre-download FaceNet weights at build time so the container never needs
# internet access during recognition.
#
# Option A: install opencv-python-headless first so pip's resolver finds
# the opencv requirement already satisfied and skips the full GUI build.
# The headless pin matches requirements.txt to avoid version conflicts.
#
# Option B (belt-and-suspenders): libgl1 + libglib2.0-0 added to the
# builder apt block above. deepface==0.0.100 pulls mtcnn as a transitive
# dep; different mtcnn versions have different opencv pins and can still
# land full opencv-python alongside headless. Having libGL present in the
# builder means the import works regardless of which cv2 gets loaded.
#
# Why --prefix=/install?
#   The weights-download Python must import from the same package tree
#   copied to the runtime image (COPY --from=builder /install /usr/local).
#
# DEEPFACE_HOME=/root ensures weights go to /root/.deepface, copied below.
RUN pip install --prefix=/install --no-cache-dir opencv-python-headless==4.10.0.84 && \
    pip install --prefix=/install --no-cache-dir deepface==0.0.100 tf-keras && \
    PYTHONPATH=/install/lib/python3.12/site-packages \
    DEEPFACE_HOME=/root \
    python -c "from deepface import DeepFace; DeepFace.build_model('Facenet')" && \
    echo "FaceNet weights downloaded successfully"

# Stage 2 (runtime)
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    libgl1 \
    libsm6 \
    libxext6 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
RUN pip install --no-cache-dir "setuptools<81"

# Copy pre-downloaded DeepFace model weights from builder stage
# so the runtime container never needs to reach the internet on first scan.
COPY --from=builder /root/.deepface /root/.deepface

COPY . /app
WORKDIR /app

# Remove any stale bytecode caches that could shadow the live source files.
# This prevents "cannot import name X from Y (unknown location)" errors
# caused by .pyc files built in a different environment being picked up
# instead of the actual __init__.py.
RUN find /app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true && \
    find /app -name "*.pyc" -delete 2>/dev/null || true

RUN mkdir -p database/

EXPOSE 5000

HEALTHCHECK CMD curl -f http://localhost:5000/health/ || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--timeout", "180", "app:create_app()"]
