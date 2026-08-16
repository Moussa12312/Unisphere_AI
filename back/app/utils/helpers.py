from sqlalchemy.orm import Query
from typing import List, Any, Tuple, Optional
from sqlalchemy import or_

def paginate_query(query: Query, page: int = 1, page_size: int = 20) -> Tuple[List[Any], int, int, int]:
    """
    Paginate a SQLAlchemy query.
    Returns (items, total, current_page, total_pages)
    """
    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return items, total, page, total_pages


def apply_search_filter(query: Query, model: Any, search: Optional[str], search_fields: List[str]) -> Query:
    """
    Apply ILIKE search filter across specified model fields.
    """
    if not search or not search_fields:
        return query
    
    filters = []
    search_pattern = f"%{search.strip()}%"
    for field_name in search_fields:
        if hasattr(model, field_name):
            field = getattr(model, field_name)
            filters.append(field.ilike(search_pattern))
            
    if filters:
        query = query.filter(or_(*filters))
        
    return query
