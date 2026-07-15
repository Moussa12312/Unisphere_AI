from fastapi import APIRouter, Depends
from app.core.dependencies import require_permission, get_current_user
from app.models.user import User
from app.core.permissions import get_all_permissions, get_role_permissions, ROLE_PERMISSIONS

router = APIRouter(
    prefix="/api/v1/roles",
    tags=["Roles & Permissions"]
)


@router.get("/permissions")
def list_all_permissions(
    current_user: User = Depends(require_permission("role:manage"))
):
    """Liste toutes les permissions disponibles (Admin seulement)."""
    return get_all_permissions()


@router.get("/roles")
def list_roles(
    current_user: User = Depends(require_permission("role:manage"))
):
    """Liste tous les rôles et leurs permissions (Admin seulement)."""
    return {
        role: {
            "permissions": permissions,
            "count": len(permissions)
        }
        for role, permissions in ROLE_PERMISSIONS.items()
    }


@router.get("/my-permissions")
def get_my_permissions(
    current_user: User = Depends(get_current_user)
):
    """L'utilisateur voit ses propres permissions."""
    return {
        "role": current_user.role,
        "permissions": get_role_permissions(current_user.role)
    }