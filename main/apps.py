"""Configuration for the main diet-planner application."""

from django.apps import AppConfig


class MainConfig(AppConfig):
    """Declare the app name and default database key type."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'main'
