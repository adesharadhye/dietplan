"""Celery tasks for asynchronous meal reminders"""

from celery import shared_task
from .models import MealItem

@shared_task
def send_meal_reminders():
    """Print a placeholder reminder for each unconsumed meal"""

    # Production delivery can replace this with email or push notifications
    items = MealItem.objects.filter(consumed=False)
    for item in items:
        print(f"Reminder: {item.meal_plan.user.username}, consume your {item.name} for {item.time_slot}!")
