from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import MealPlan, MealItem
from .serializers import MealPlanSerializer
from .tasks import send_meal_reminders
from datetime import date, timedelta
import io
import sys


class MealModelsSerializerTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='testuser', password='pass')

	def test_str_methods(self):
		mp = MealPlan.objects.create(user=self.user, date=date.today())
		item = MealItem.objects.create(meal_plan=mp, name='Oatmeal', time_slot='morning', consumed=False)
		self.assertEqual(str(mp), f"{self.user.username} - {mp.date}")
		self.assertIn('Oatmeal', str(item))

	def test_serializer_create_and_update(self):
		validated = {
			'user': self.user,
			'date': date.today(),
			'items': [
				{'name': 'Eggs', 'time_slot': 'morning', 'consumed': False}
			]
		}
		mp = MealPlanSerializer().create(validated)
		self.assertEqual(MealPlan.objects.count(), 1)
		self.assertEqual(MealItem.objects.filter(meal_plan=mp).count(), 1)

		# update
		new_date = date.today() + timedelta(days=1)
		update_data = {
			'date': new_date,
			'items': [
				{'name': 'Salad', 'time_slot': 'afternoon', 'consumed': False}
			]
		}
		mp = MealPlanSerializer().update(mp, update_data)
		self.assertEqual(mp.date, new_date)
		self.assertEqual(mp.items.count(), 1)
		self.assertEqual(mp.items.first().name, 'Salad')


class TasksTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='alice', password='pass')

	def test_send_meal_reminders_outputs(self):
		mp = MealPlan.objects.create(user=self.user, date=date.today())
		item = MealItem.objects.create(meal_plan=mp, name='Toast', time_slot='morning', consumed=False)
		captured = io.StringIO()
		real_stdout = sys.stdout
		try:
			sys.stdout = captured
			send_meal_reminders()
		finally:
			sys.stdout = real_stdout
		output = captured.getvalue()
		self.assertIn('Reminder', output)
		self.assertIn('Toast', output)


class ValidationAndAPITests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username='bob', password='pass')
		self.other = User.objects.create_user(username='carol', password='pass')

	def test_unique_mealplan_constraint(self):
		today = date.today()
		MealPlan.objects.create(user=self.user, date=today)
		from django.db import IntegrityError
		with self.assertRaises(IntegrityError):
			MealPlan.objects.create(user=self.user, date=today)

	def test_mealitem_time_slot_validation(self):
		mp = MealPlan.objects.create(user=self.user, date=date.today())
		mi = MealItem(meal_plan=mp, name='BadSlot', time_slot='invalid')
		from django.core.exceptions import ValidationError
		with self.assertRaises(ValidationError):
			mi.full_clean()

	def test_serializer_update_without_items_keeps_existing(self):
		mp = MealPlan.objects.create(user=self.user, date=date.today())
		MealItem.objects.create(meal_plan=mp, name='KeepMe', time_slot='morning')
		new_date = date.today() + timedelta(days=2)
		updated = MealPlanSerializer().update(mp, {'date': new_date})
		self.assertEqual(updated.items.count(), 1)
		self.assertEqual(updated.items.first().name, 'KeepMe')

	def test_api_list_and_create_mealplans(self):
		# create mealplans for both users
		MealPlan.objects.create(user=self.user, date=date.today())
		MealPlan.objects.create(user=self.other, date=date.today())

		client = APIClient()
		client.force_authenticate(user=self.user)
		resp = client.get('/api/mealplans/')
		self.assertEqual(resp.status_code, 200)
		self.assertEqual(len(resp.json()), 1)

		# create via API
		payload = {
			'date': str(date.today() + timedelta(days=1)),
			'items': [
				{'name': 'Pancake', 'time_slot': 'morning', 'consumed': False}
			]
		}
		resp2 = client.post('/api/mealplans/', payload, format='json')
		self.assertEqual(resp2.status_code, 201)
		self.assertEqual(MealPlan.objects.filter(user=self.user).count(), 2)
