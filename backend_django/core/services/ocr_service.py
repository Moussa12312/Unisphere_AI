try:
    import easyocr as _easyocr
    _reader = _easyocr.Reader(['fr', 'en'], gpu=False)
    _OCR_AVAILABLE = True
except ImportError:
    print("[WARNING] easyocr not installed. OCR features will be disabled. Install with: pip install easyocr")
    _reader = None
    _OCR_AVAILABLE = False

from PIL import Image
from io import BytesIO
import re
from datetime import datetime

def extract_text_from_image(image_bytes: bytes) -> str:
    """Extrait le texte d'une image avec EasyOCR"""
    if not _OCR_AVAILABLE or _reader is None:
        print("[WARNING] OCR not available. Install easyocr to enable this feature.")
        return ""
    try:
        image = Image.open(BytesIO(image_bytes))
        results = _reader.readtext(image, detail=0)
        return ' '.join(results)
    except Exception as e:
        print(f"Erreur OCR: {e}")
        return ""

def extract_student_info(text: str) -> dict:
    """Extrait les informations étudiant du texte OCR"""
    info = {
        'nom': '',
        'prenom': '',
        'date_naissance': '',
        'lieu_naissance': '',
        'numero_piece': ''
    }
    
    # Regex pour les noms (majuscules, 2-30 caractères)
    nom_patterns = [
        r'(?:NOM|NOMS?|SURNAME)[:\s]*([A-Z][A-ZÀ-ÿ\s\-]{2,30})',
        r'([A-Z][A-ZÀ-ÿ\s\-]{5,30})\s+(?:PRÉNOM|PRENOM)',
    ]
    
    for pattern in nom_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            info['nom'] = match.group(1).strip()
            break
    
    # Regex pour les prénoms
    prenom_patterns = [
        r'(?:PRÉNOM|PRENOM|PRÉNOMS|PRENOMS)[:\s]*([A-Z][a-zà-ÿ\s\-]{2,30})',
        r'(?:Né(?:e)?\s+le\s+\d{1,2}[/\-.]\d{1,2}[/\-.]\d{4}\s+à\s+)([A-Z][a-zà-ÿ\s\-]{2,30})',
    ]
    
    for pattern in prenom_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            info['prenom'] = match.group(1).strip()
            break
    
    # Regex pour les dates de naissance
    date_patterns = [
        r'(?:N[ÉE]E?\s+LE|N[ÉE]\s+LE|DATE\s+DE\s+NAISSANCE)[:\s]*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})',
        r'(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})',
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            # Normaliser la date
            date_str = date_str.replace('-', '/').replace('.', '/')
            parts = date_str.split('/')
            if len(parts) == 3:
                day, month, year = parts
                if len(year) == 2:
                    year = f"19{year}" if int(year) > 50 else f"20{year}"
                info['date_naissance'] = f"{day.zfill(2)}/{month.zfill(2)}/{year}"
            break
    
    # Regex pour le lieu de naissance
    lieu_patterns = [
        r'(?:N[ÉE]E?\s+LE\s+\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\s+[ÀA]\s+)([A-Z][a-zà-ÿ\s\-]{2,30})',
        r'(?:LIEU\s+DE\s+NAISSANCE|LIEU)[:\s]*([A-Z][a-zà-ÿ\s\-]{2,30})',
    ]
    
    for pattern in lieu_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            info['lieu_naissance'] = match.group(1).strip()
            break
    
    # Regex pour numéro de pièce (CNI)
    numero_patterns = [
        r'(?:N°|NUM[ÉE]RO|NUMERO)[:\s]*([A-Z0-9]{5,20})',
        r'([A-Z]{2}\d{6,15})',
    ]
    
    for pattern in numero_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            info['numero_piece'] = match.group(1).strip()
            break
    
    return info