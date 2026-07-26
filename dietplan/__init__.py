"""Expose the Celery app whenever the Django project package is imported."""

from .celery import app as celery_app

# Define the public value exported by this package.
__all__ = ('celery_app',)
