from rest_framework import serializers
from .models import MealPlan, MealItem

class MealItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealItem
        fields = ['id', 'name', 'time_slot', 'consumed']

class MealPlanSerializer(serializers.ModelSerializer):
    items = MealItemSerializer(many=True)

    class Meta:
        model = MealPlan
        fields = ['id', 'date', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        meal_plan = MealPlan.objects.create(**validated_data)
        for item_data in items_data:
            MealItem.objects.create(meal_plan=meal_plan, **item_data)
        return meal_plan

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance.date = validated_data.get('date', instance.date)
        instance.save()

        if items_data:
            instance.items.all().delete()
            for item_data in items_data:
                MealItem.objects.create(meal_plan=instance, **item_data)
        return instance
