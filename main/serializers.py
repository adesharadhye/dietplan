from rest_framework import serializers
from django.db import transaction
from .models import MealPlan, MealItem

class MealItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealItem
        fields = ['id', 'name', 'time_slot', 'consumed']

class MealPlanSerializer(serializers.ModelSerializer):
    """Read and write a plan together with its nested meal items"""

    items = MealItemSerializer(many=True)

    class Meta:
        model = MealPlan
        fields = ['id', 'date', 'items']

    def create(self, validated_data):
        # A user has one plan per date, so later submissions append new meals
        items_data = validated_data.pop('items')
        with transaction.atomic():
            meal_plan, _ = MealPlan.objects.get_or_create(**validated_data)
            MealItem.objects.bulk_create([
                MealItem(meal_plan=meal_plan, **item_data)
                for item_data in items_data
            ])
        return meal_plan

    def update(self, instance, validated_data):
        # The client sends the complete item list when toggling or deleting meals
        items_data = validated_data.pop('items', None)
        instance.date = validated_data.get('date', instance.date)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                MealItem.objects.create(meal_plan=instance, **item_data)
        return instance
