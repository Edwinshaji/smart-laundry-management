from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0001_initial'),
        ('payments', '0001_initial'),
    ]

    operations = [
        # NO-OP: these fields are already created in payments/0001_initial.py.
        # Keeping this migration file (empty) prevents duplicate column errors
        # for databases that already have due_date/subscription.
    ]
