# Nourish Diet Planner

Nourish is a full-stack meal-planning application built with Django REST Framework and React. Users can create an account, securely log in, plan meals by date, track completed meals, and manage their own data.

## Features

- Custom React login and signup interfaces
- Secure Django session authentication with CSRF protection
- Username, email, phone number, and password validation
- Email OTP password recovery through Gmail SMTP
- Modern responsive HTML OTP emails
- User-specific meal-plan isolation
- Add multiple meals to the same daily plan
- Mark meals as consumed
- Delete individual meals or complete daily plans
- Responsive desktop and mobile design
- Celery task placeholder for meal reminders

## Technology

### Backend

- Python
- Django 5
- Django REST Framework
- MySQL
- Celery and Redis

### Frontend

- React 19
- Vite
- CSS

## Project Structure

```text
dietplan/
├── dietplan/                  # Django project settings and root routes
├── main/                      # Models, API views, serializers, and migrations
│   ├── migrations/
│   └── templates/
│       └── main/emails/       # HTML OTP email template
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── main.jsx           # Main application component
│   │   └── styles.css
│   └── dist/                  # Production frontend build
├── manage.py
└── requirements.txt
```

## Local Setup

### 1. Clone the repository

```powershell
git clone https://github.com/adesharadhye/dietplan.git
cd dietplan
```

### 2. Create and activate a Python environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
python -m pip install -r requirements.txt
```

### 4. Create the MySQL database

Create a database named `dietplan_db`:

```sql
CREATE DATABASE dietplan_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Update the database credentials in `dietplan/settings.py` for your local MySQL installation. For production, read all database credentials from environment variables.

### 5. Apply database migrations

```powershell
python manage.py migrate
```

### 6. Install and build the frontend

```powershell
cd frontend
npm install
npm run build
cd ..
```

### 7. Start Django

```powershell
python manage.py runserver
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Development Frontend

Run Django in one terminal:

```powershell
python manage.py runserver
```

Run Vite in another terminal:

```powershell
cd frontend
npm run dev
```

Vite forwards `/api` requests to Django at `http://127.0.0.1:8000`.

## Password-Recovery Email

Password recovery uses Gmail SMTP. Enable two-step verification on the sender’s Google account and generate a Gmail app password.

Set the credentials in the same PowerShell session that starts Django:

```powershell
$env:NOURISH_EMAIL_HOST_USER="sender@example.com"
$env:NOURISH_EMAIL_HOST_PASSWORD="your-16-character-app-password"
python manage.py runserver
```

Never add an email password to `settings.py`, `.env` files committed to Git, or source code.

The reset flow:

1. Confirms that the email belongs to an active account.
2. Generates a six-digit OTP.
3. Stores only a secure hash of the OTP.
4. Emails the code using a responsive HTML template.
5. Expires the code after 10 minutes.
6. Limits verification to five failed attempts.

## API Routes

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/auth/session/` | Return current session information |
| `POST` | `/api/auth/signup/` | Create an account |
| `POST` | `/api/auth/login/` | Start an authenticated session |
| `POST` | `/api/auth/logout/` | End the current session |
| `POST` | `/api/auth/forgot-password/` | Request a password-reset OTP |
| `POST` | `/api/auth/reset-password/` | Verify an OTP and reset the password |

### Meal Plans

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/mealplans/` | List the current user’s plans |
| `POST` | `/api/mealplans/` | Create a plan or append meals to a date |
| `GET` | `/api/mealplans/{id}/` | Retrieve an owned plan |
| `PUT` | `/api/mealplans/{id}/` | Update meals in an owned plan |
| `DELETE` | `/api/mealplans/{id}/` | Delete an owned plan |

Meal-plan endpoints require authentication. Querysets are filtered by the current user, preventing access to another user’s records.

## Useful Commands

Run Django checks:

```powershell
python manage.py check
```

Run tests:

```powershell
python manage.py test
```

Create migrations after changing models:

```powershell
python manage.py makemigrations
python manage.py migrate
```

Build the production frontend:

```powershell
cd frontend
npm run build
```

Run a Celery worker after Redis is available:

```powershell
celery -A dietplan worker --loglevel=info
```

## Security Notes

- Keep `SECRET_KEY`, database passwords and SMTP passwords in environment variables for deployment.
- Keep `DEBUG=False` in production.
- Restrict `ALLOWED_HOSTS` to trusted hostnames.
- Serve the application over HTTPS.
- Do not commit `venv`, `.env`, bytecode, or local databases.
- Rotate any credential accidentally shared or committed.

## License

No license has been specified for this project.
