from django.apps import AppConfig

import os
import sys
import threading
import time as _time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "payments"

    def ready(self):
        argv = " ".join(sys.argv).lower()
        is_server = ("runserver" in sys.argv) or any(k in argv for k in ("gunicorn", "uwsgi", "daphne", "uvicorn", "hypercorn", "waitress"))
        if not is_server:
            return

        # Avoid double-run under dev autoreloader
        if settings.DEBUG and os.environ.get("RUN_MAIN") != "true":
            return

        def _run_fine_batch():
            try:
                from .services import ensure_fines_for_all_overdue
                ensure_fines_for_all_overdue(today=timezone.localdate())
            except Exception:
                pass

        # Startup catch-up (covers downtime / missed daily fine run)
        if getattr(settings, "ENABLE_FINE_STARTUP_CATCHUP", True):
            threading.Thread(target=_run_fine_batch, name="fine-startup-catchup", daemon=True).start()

        # Daily fine job (works only when server is running)
        if not getattr(settings, "ENABLE_DAILY_FINE_JOB", True):
            return

        def _job_loop():
            while True:
                try:
                    now_local = timezone.localtime(timezone.now())
                    # Run shortly after midnight to avoid edge timing
                    next_run = (now_local + timedelta(days=1)).replace(hour=0, minute=5, second=0, microsecond=0)
                    sleep_s = max(1, int((next_run - now_local).total_seconds()))
                    _time.sleep(sleep_s)
                    _run_fine_batch()
                except Exception:
                    _time.sleep(60)

        threading.Thread(target=_job_loop, name="daily-fine-job", daemon=True).start()
