import json
import re
import secrets
import smtplib
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.http import JsonResponse
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework import viewsets, permissions
from .models import MealPlan, PasswordResetOTP, UserProfile
from .serializers import MealPlanSerializer


@require_GET
@ensure_csrf_cookie
@never_cache
def session_view(request):
    """Return the current session state and ensure the client has a CSRF cookie."""

    return JsonResponse({
        "authenticated": request.user.is_authenticated,
        "username": request.user.get_username() if request.user.is_authenticated else "",
    })


@require_POST
@csrf_protect
def login_view(request):
    """Authenticate JSON credentials and start a Django session."""

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request."}, status=400)

    user = authenticate(
        request,
        username=data.get("username", "").strip(),
        password=data.get("password", ""),
    )
    if user is None:
        return JsonResponse({"detail": "Incorrect username or password."}, status=400)

    login(request, user)
    return JsonResponse({"authenticated": True, "username": user.get_username()})


@require_POST
@csrf_protect
def signup_view(request):
    """Validate account fields and create a user with a phone profile."""

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request."}, status=400)

    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    phone_number = re.sub(r"[\s()-]", "", data.get("phone_number", "").strip())
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    errors = {}

    if not re.fullmatch(r"[\w.@+-]{3,150}", username):
        errors["username"] = "Use 3–150 letters, numbers, or @/./+/-/_ characters."
    elif User.objects.filter(username__iexact=username).exists():
        errors["username"] = "That username is already taken."

    try:
        validate_email(email)
    except ValidationError:
        errors["email"] = "Enter a valid email address."
    else:
        if User.objects.filter(email__iexact=email).exists():
            errors["email"] = "An account already uses this email address."

    if not re.fullmatch(r"\+?[0-9]{7,15}", phone_number):
        errors["phone_number"] = "Enter a valid phone number with 7–15 digits."
    elif UserProfile.objects.filter(phone_number=phone_number).exists():
        errors["phone_number"] = "An account already uses this phone number."

    if password != confirm_password:
        errors["confirm_password"] = "Passwords do not match."
    else:
        try:
            validate_password(password, user=User(username=username, email=email))
        except ValidationError as exc:
            errors["password"] = " ".join(exc.messages)

    if errors:
        return JsonResponse({"errors": errors}, status=400)

    with transaction.atomic():
        user = User.objects.create_user(username=username, email=email, password=password)
        UserProfile.objects.create(user=user, phone_number=phone_number)

    return JsonResponse({"detail": "Account created. You can now log in."}, status=201)


@require_POST
@csrf_protect
def forgot_password_view(request):
    """Email a time-limited OTP to an existing active account."""

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request."}, status=400)

    email = data.get("email", "").strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"errors": {"email": "Enter a valid email address."}}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return JsonResponse(
            {"errors": {"email": "No account exists with this email address."}},
            status=404,
        )

    if not settings.EMAIL_HOST_PASSWORD:
        return JsonResponse(
            {"detail": "Recovery email is not configured. Contact the administrator."},
            status=503,
        )

    recent = PasswordResetOTP.objects.filter(
        user=user,
        created_at__gte=timezone.now() - timedelta(seconds=60),
    ).exists()
    if recent:
        return JsonResponse(
            {"detail": "Please wait one minute before requesting another code."},
            status=429,
        )

    # Invalidate earlier codes so only the newest OTP can reset the password.
    code = f"{secrets.randbelow(1_000_000):06d}"
    PasswordResetOTP.objects.filter(user=user, used=False).update(used=True)
    otp = PasswordResetOTP.objects.create(
        user=user,
        code_hash=make_password(code),
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    try:
        # Render a branded HTML email while retaining a plain-text fallback.
        html_message = render_to_string(
            "main/emails/password_reset_otp.html",
            {"code": code, "username": user.username},
        )
        send_mail(
            "Your Nourish password reset code",
            f"Your Nourish verification code is {code}. It expires in 10 minutes.",
            None,
            [user.email],
            fail_silently=False,
            html_message=html_message,
        )
    except (smtplib.SMTPException, OSError):
        otp.delete()
        return JsonResponse(
            {"detail": "The recovery email could not be sent. Check the SMTP credentials and try again."},
            status=502,
        )

    return JsonResponse({"detail": "A verification code has been sent to your email address."})


@require_POST
@csrf_protect
def reset_password_view(request):
    """Verify the latest OTP and replace the account password."""

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Invalid request."}, status=400)

    email = data.get("email", "").strip().lower()
    code = data.get("code", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    errors = {}

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    otp = (
        PasswordResetOTP.objects.filter(user=user, used=False).order_by("-created_at").first()
        if user else None
    )
    if not re.fullmatch(r"[0-9]{6}", code):
        errors["code"] = "Enter the six-digit code."
    elif not otp or otp.expires_at <= timezone.now() or otp.attempts >= 5:
        errors["code"] = "This code is invalid or expired. Request a new one."
    elif not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        errors["code"] = "This code is incorrect."

    if password != confirm_password:
        errors["confirm_password"] = "Passwords do not match."
    elif user:
        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            errors["password"] = " ".join(exc.messages)

    if errors:
        return JsonResponse({"errors": errors}, status=400)

    with transaction.atomic():
        user.set_password(password)
        user.save(update_fields=["password"])
        otp.used = True
        otp.save(update_fields=["used"])

    return JsonResponse({"detail": "Password reset successfully. You can now log in."})


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({"authenticated": False})

@method_decorator(never_cache, name="dispatch")
class MealPlanViewSet(viewsets.ModelViewSet):
    """CRUD API restricted to meal plans owned by the current user."""

    serializer_class = MealPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # This ownership filter also protects retrieve, update, and delete actions.
        return MealPlan.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
