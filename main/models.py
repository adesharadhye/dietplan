from django.db import models
from django.contrib.auth.models import User

TIME_SLOTS = [
    ('morning', 'Morning'),
    ('afternoon', 'Afternoon'),
    ('evening', 'Evening'),
    ('night', 'Night'),
]

class MealPlan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.username} - {self.date}"

class MealItem(models.Model):
    meal_plan = models.ForeignKey(MealPlan, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    time_slot = models.CharField(max_length=20, choices=TIME_SLOTS)
    consumed = models.BooleanField(default=False)  # Track if consumed

    def __str__(self):
        return f"{self.name} ({self.time_slot})"
