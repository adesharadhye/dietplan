"""Django admin configuration for meal plans and items."""

from django.contrib import admin
from .models import MealPlan, MealItem

class MealItemInline(admin.TabularInline):
    """Edit meal items within their parent plan."""

    model = MealItem
    extra = 1

class MealPlanAdmin(admin.ModelAdmin):
    """Display plan ownership and embed associated meals."""

    list_display = ['user', 'date']
    inlines = [MealItemInline]

# Register the customized meal-plan admin.
admin.site.register(MealPlan, MealPlanAdmin)
