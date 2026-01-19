from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View




def health(request):
    return JsonResponse({"status": "ok"})


# Note: Authentication endpoints are implemented in backend/accounts/views.py.
# This core CustomerLoginView is only a placeholder; use /api/accounts/customer/login/.

@method_decorator(csrf_exempt, name='dispatch')
class CustomerLoginView(View):
    def post(self, request, *args, **kwargs):
        return JsonResponse(
            {"detail": "Use /api/accounts/customer/login/ for authentication."},
            status=400
        )