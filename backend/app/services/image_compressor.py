"""
UniSphere AI - Module d'Optimisation et Compression Automatique des Documents & Scans
Permet de réduire la taille des photos et scans étudiants de 80% à 95%
sans perte de lisibilité (passe de 5 Mo à ~150-250 Ko).
"""

import io
import os
import logging
from pathlib import Path
from typing import Tuple, Union
from PIL import Image, ImageOps

logger = logging.getLogger("unisphere.compressor")

# Extensions d'images prises en charge pour la compression
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}

def is_image_file(filename_or_ext: str) -> bool:
    """Vérifie si l'extension correspond à une image compressible."""
    ext = Path(filename_or_ext).suffix.lower()
    return ext in IMAGE_EXTENSIONS

def compress_image_data(
    data: bytes,
    filename: str = "",
    max_dimension: int = 1600,
    quality: int = 80
) -> Tuple[bytes, str]:
    """
    Compresse un flux d'octets image :
    1. Corrige l'orientation EXIF (photos prises par smartphone à l'envers).
    2. Redimensionne si la largeur ou hauteur dépasse max_dimension (1600px).
    3. Optimise l'encodage JPEG avec quality=80.
    4. Retourne les octets compressés et l'extension adaptée.
    """
    if not data or len(data) < 100:
        return data, Path(filename).suffix.lower() or ".jpg"

    try:
        with Image.open(io.BytesIO(data)) as img:
            # 1. Correction de l'orientation EXIF smartphone
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass

            # 2. Gestion de la transparence / conversion en RGB
            if img.mode in ("RGBA", "LA", "P"):
                # Fond blanc propre pour les documents scannés transparents
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # 3. Redimensionnement intelligent si trop grand
            w, h = img.size
            if max(w, h) > max_dimension:
                scale = max_dimension / float(max(w, h))
                new_w = max(1, int(w * scale))
                new_h = max(1, int(h * scale))
                img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # 4. Encodage JPEG optimisé
            out_buffer = io.BytesIO()
            img.save(
                out_buffer,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True
            )
            compressed_bytes = out_buffer.getvalue()

            # Ne garder le compressé que s'il est plus léger ou égal à l'original
            if len(compressed_bytes) < len(data):
                reduction = (1 - (len(compressed_bytes) / len(data))) * 100
                logger.info(
                    f"Scan/Image compressé : {len(data) / 1024:.1f} Ko -> {len(compressed_bytes) / 1024:.1f} Ko (-{reduction:.1f}%)"
                )
                return compressed_bytes, ".jpg"
            else:
                return data, Path(filename).suffix.lower() or ".jpg"

    except Exception as e:
        logger.warning(f"Impossible de compresser l'image ({e}), conservation de l'original.")
        return data, Path(filename).suffix.lower() or ".jpg"

def compress_and_save_upload(
    data: bytes,
    target_path: Union[str, Path],
    max_dimension: int = 1600,
    quality: int = 80
) -> Path:
    """
    Compresse et enregistre un fichier téléversé (scan étudiant, photo d'identité, justificatif).
    Si c'est une image, applique la compression et ajuste l'extension si nécessaire.
    Si c'est un PDF ou autre format, l'écrit directement.
    """
    path = Path(target_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    ext = path.suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        compressed_bytes, new_ext = compress_image_data(
            data,
            filename=path.name,
            max_dimension=max_dimension,
            quality=quality
        )
        # Ajuster l'extension si convertie en .jpg
        if new_ext != ext and ext in {".png", ".bmp", ".tiff", ".tif"}:
            path = path.with_suffix(new_ext)
        
        with open(path, "wb") as f:
            f.write(compressed_bytes)
        return path
    else:
        # Pour les fichiers PDF et autres documents non-image
        with open(path, "wb") as f:
            f.write(data)
        return path

