"""API routes for authentication, recovery, and meal-plan operations."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MealPlanViewSet,
    forgot_password_view,
    login_view,
    logout_view,
    reset_password_view,
    session_view,
    signup_view,
)

# DRF generates list/detail/create/update/delete routes.
router = DefaultRouter()
router.register(r'mealplans', MealPlanViewSet, basename='mealplan')

urlpatterns = [
    # JSON authentication routes consumed by React.
    path('auth/session/', session_view, name='session'),
    path('auth/login/', login_view, name='login'),
    path('auth/signup/', signup_view, name='signup'),
    path('auth/forgot-password/', forgot_password_view, name='forgot-password'),
    path('auth/reset-password/', reset_password_view, name='reset-password'),
    path('auth/logout/', logout_view, name='logout'),
    # Include all generated meal-plan routes.
    path('', include(router.urls)),
]
