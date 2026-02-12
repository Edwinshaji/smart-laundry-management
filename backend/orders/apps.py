from django.apps import AppConfig

# NEW: required imports (fix NameError in ready())
import os
import sys
import threading
import time as _time
from datetime import timedelta
from django.conf import settings
from django.utils import timezone


class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'

    def ready(self):
        # Only start background threads when running a server process
        argv = " ".join(sys.argv).lower()
        is_server = ("runserver" in sys.argv) or any(k in argv for k in ("gunicorn", "uwsgi", "daphne", "uvicorn", "hypercorn", "waitress"))
        if not is_server:
            return

        # Avoid double-run under dev autoreloader
        if settings.DEBUG and os.environ.get("RUN_MAIN") != "true":
            return

        # NEW: on-startup catch-up (covers "server was down at 12 AM" case)
        if getattr(settings, "ENABLE_MONTHLY_ORDER_STARTUP_CATCHUP", True):
            def _startup_catchup():
                try:
                    # Import lazily to avoid circular import at startup
                    from . import views as order_views
                    fn = getattr(order_views, "_ensure_monthly_orders_for_all", None)
                    if callable(fn):
                        # CHANGED: only ensure TODAY (avoid generating tomorrow)
                        fn(for_date=timezone.localdate(), lock_timeout_s=1)
                except Exception:
                    _time.sleep(1)

            threading.Thread(target=_startup_catchup, name="monthly-order-startup-catchup", daemon=True).start()

        # Existing in-process midnight job (works only if server is running)
        if not getattr(settings, "ENABLE_DAILY_MONTHLY_ORDER_JOB", False):
            return

        def _job_loop():
            while True:
                try:
                    now_local = timezone.localtime(timezone.now())
                    next_midnight = (now_local + timedelta(days=1)).replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                    sleep_s = max(1, int((next_midnight - now_local).total_seconds()))
                    _time.sleep(sleep_s)

                    from . import views as order_views
                    fn = getattr(order_views, "_ensure_monthly_orders_for_all", None)
                    if callable(fn):
                        # CHANGED: only generate for the new day (today at runtime)
                        fn(for_date=timezone.localdate(), lock_timeout_s=5)
                except Exception:
                    _time.sleep(60)

        threading.Thread(target=_job_loop, name="monthly-order-midnight-job", daemon=True).start()
