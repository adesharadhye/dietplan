"""Create and configure the Celery application used by Django."""

import os
from celery import Celery

# Tell Celery which Django settings module should be loaded.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'dietplan.settings')

# Create the worker application under the project name.
app = Celery('dietplan')

# Import settings prefixed with CELERY_ from Django configuration.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover shared tasks declared by installed Django apps.
app.autodiscover_tasks()
