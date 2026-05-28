#!/usr/bin/env bash
# exit on error
set -o errexit

echo ">>> Installing dependencies..."
pip install -r requirements.txt

echo ">>> Collecting static files..."
python manage.py collectstatic --no-input

echo ">>> Applying database migrations..."
python manage.py migrate

echo ">>> Creating superuser if variables are set..."
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    python manage.py createsuperuser --noinput || true
fi

echo ">>> Build completed successfully!"
