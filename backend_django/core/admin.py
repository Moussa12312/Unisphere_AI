from django.contrib import admin
import inspect
from . import models

# Register all models dynamically into Django Admin
for name, cls in inspect.getmembers(models, inspect.isclass):
    if issubclass(cls, models.models.Model) and cls.__module__ == models.__name__:
        try:
            # Custom admin class with search and list display
            class CustomAdmin(admin.ModelAdmin):
                # Dynamically set list_display with first 5 fields
                list_display = [f.name for f in cls._meta.fields[:6]]
                search_fields = [f.name for f in cls._meta.fields if isinstance(f, (models.models.CharField, models.models.TextField))][:3]
            
            admin.site.register(cls, CustomAdmin)
        except Exception:
            try:
                admin.site.register(cls)
            except Exception:
                pass
