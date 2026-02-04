from django.apps import AppConfig

class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'

    def ready(self):
        # NEW: daily 12:00 AM monthly-order generation (in-process scheduler)
        import os, threading, time as _time
        from datetime import timedelta
        from django.conf import settings
        from django.utils import timezone

        # Avoid double-run under dev autoreloader, and allow disabling via env
        if not getattr(settings, "ENABLE_DAILY_MONTHLY_ORDER_JOB", False):
            return
        if settings.DEBUG and os.environ.get("RUN_MAIN") != "true":
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

                    # Import lazily to avoid circular import at startup
                    from . import views as order_views
                    fn = getattr(order_views, "_ensure_monthly_orders_for_all", None)
                    if callable(fn):
                        fn()
                except Exception:
                    # Keep loop alive; avoid crashing the server due to scheduler errors
                    _time.sleep(60)

        threading.Thread(target=_job_loop, name="monthly-order-midnight-job", daemon=True).start()
