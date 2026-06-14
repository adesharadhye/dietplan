from django.contrib import admin
from .models import MealPlan, MealItem

class MealItemInline(admin.TabularInline):
    model = MealItem
    extra = 1

class MealPlanAdmin(admin.ModelAdmin):
    list_display = ['user', 'date']
    inlines = [MealItemInline]

admin.site.register(MealPlan, MealPlanAdmin)
