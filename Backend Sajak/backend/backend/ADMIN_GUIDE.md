# myTIMeS Admin Panel — Usage & Developer Guide

## What is the Admin Panel?

The Admin Panel is a secure, server-rendered web interface built with **Flask-Admin** that allows system administrators to view, manage, and manipulate database records directly from a browser.

### API vs Admin Panel

*   **REST API (`/api/*`)**: Used by the frontend web/mobile apps. Uses JSON data and JWT (token-based) authentication.
*   **Admin Panel (`/admin/*`)**: Used by human administrators. Uses standard HTML web pages and Cookie/Session-based authentication (via Flask-Login). 

**Both interfaces talk to the same SQLite database and use the same underlying SQLAlchemy models.**

---

## How to Access It

1.  Start the Flask backend server:
    ```bash
    python backend/app.py
    ```
2.  Open your web browser and navigate to:
    **[http://localhost:5000/admin/](http://localhost:5000/admin/)**
3.  You will be redirected to the login page (`/admin/login`).

---

## How to Create Admin Users

Because the Admin Panel requires an existing admin account to log in, you must create your first admin using the provided seed script.

### Creating the First Admin
1.  Run the seed script from the terminal:
    ```bash
    python backend/seed_admin.py
    ```
2.  This creates a user with the default credentials:
    *   **Email:** `admin@mytimes.com`
    *   **Password:** `admin123`
    *   **Role:** `admin`

### Creating Additional Admins
Once you are logged into the Admin Panel, you can create more administrators via the UI:
1.  Navigate to **Users & Roles > Users**.
2.  Click **Create**.
3.  Fill in the details, ensuring you select **`admin`** from the Role dropdown.
4.  Enter a password (it will be securely hashed upon saving).
5.  Click **Save**.

---

## How Permissions Work

Access to the Admin Panel is strictly governed by role-based access control (RBAC).

*   **Only users with `role == 'admin'` can access the `/admin/` routes.**
*   If a `teacher` or `student` attempts to log in via the Admin Panel login form, they will receive an "Access denied" message.
*   Unauthenticated users are automatically redirected to the login page.

This is enforced by the custom base views (`SecureModelView`, `ReadOnlyAdminView`, `AdminOnlyView`) which all override the `is_accessible()` method to check both authentication status and admin role.

---

## How to Register New Models

If you add a new table/model to your SQLAlchemy database (e.g., in `models/new_feature.py`), you need to register it with Flask-Admin so it appears in the UI.

1.  **Create a Model View:** Create a new file in `admin/model_views/` (e.g., `new_feature_admin.py`). Inherit from `SecureModelView` (for CRUD) or `ReadOnlyAdminView` (for read-only logs).
    ```python
    from admin.base_views import SecureModelView

    class NewFeatureAdmin(SecureModelView):
        column_list = ["id", "name", "created_at"]
        column_searchable_list = ["name"]
        # Customize as needed...
    ```

2.  **Register the View:** Open `admin/__init__.py`.
    *   Import your new model: `from models.new_feature import NewFeature`
    *   Import your new view: `from admin.model_views.new_feature_admin import NewFeatureAdmin`
    *   Register it with the `admin` instance:
        ```python
        admin.add_view(NewFeatureAdmin(NewFeature, db.session, name="New Features", category="Misc"))
        ```

---

## How to Customize Admin Views

Flask-Admin is highly customizable via properties on the view class. Open any file in `admin/model_views/` to see these in action.

*   **Columns to Display:** `column_list = ["col1", "col2"]`
*   **Renaming Columns:** `column_labels = {"col1": "Friendly Name"}`
*   **Search Bar:** `column_searchable_list = ["name", "email"]`
*   **Filters:** `column_filters = ["status", "created_at"]`
*   **Read-Only Form Fields:** `form_widget_args = {"created_at": {"disabled": True}}`
*   **Exclude from Forms:** `form_excluded_columns = ["password_hash"]`
*   **Formatters (e.g., displaying relationships):**
    ```python
    column_formatters = {
        # 'm' is the model instance
        "teacher": lambda v, c, m, n: m.teacher.fullname if m.teacher else "—"
    }
    ```
*   **Pre-Save Hooks:** Use `on_model_change(self, form, model, is_created)` to manipulate data before it's saved to the database (see `UserAdmin` for password hashing or `WaiverRequestAdmin` for auto-updating attendance status).

---

## How to Maintain the Admin System

*   **Dependencies:** The admin panel relies on `flask-admin`, `flask-login`, and `flask-wtf`. Ensure these remain updated in `requirements.txt`.
*   **Security:** Flask-WTF is configured (`WTF_CSRF_ENABLED = True` in `config.py`) to automatically generate and validate CSRF tokens for all admin forms. Do not disable this.
*   **Passwords:** Passwords are never displayed in the admin UI. When editing a user, leaving the password field blank retains their existing password. Entering a new password hashes it via `bcrypt` before saving. 
*   **Troubleshooting Login Issues:** If you cannot log in, verify that your user account has `role='admin'` in the `users` table of the SQLite database.
