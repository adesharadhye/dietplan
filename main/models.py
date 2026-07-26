from django.db import models
from django.contrib.auth.models import User

TIME_SLOTS = [
    ('morning', 'Morning'),
    ('afternoon', 'Afternoon'),
    ('evening', 'Evening'),
    ('night', 'Night'),
]


class MealPlan(models.Model):
    """One dated meal plan belonging to one user"""

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.username} - {self.date}"

class MealItem(models.Model):
    """A meal entry contained in a dated meal plan."""

    meal_plan = models.ForeignKey(MealPlan, related_name='items', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    time_slot = models.CharField(max_length=20, choices=TIME_SLOTS)
    consumed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.time_slot})"


class UserProfile(models.Model):
    """Additional account data that is not part of Django's User model"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=16, unique=True)

    def __str__(self):
        return self.user.username


class PasswordResetOTP(models.Model):
    """A short-lived, hashed verification code for password recovery"""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_otps')
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)

    def __str__(self):
        return f"Password reset for {self.user.username}"
