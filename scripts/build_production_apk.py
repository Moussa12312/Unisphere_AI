"""
Script de compilation et signature automatique de l'APK Officiel UniSphere AI
Cible : https://www.unisphere-ai.com (Production Sécurisée HTTPS)
"""

import os
import sys

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import struct
import zlib
import hashlib
import zipfile
import base64
from datetime import datetime, timezone

from cryptography.hazmat.primitives.serialization.pkcs12 import load_key_and_certificates
from cryptography.hazmat.primitives.serialization import pkcs7, Encoding
from cryptography.hazmat.primitives import hashes

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APK_PATH = os.path.join(BASE_DIR, "frontend", "public", "download", "unisphereai.apk")
P12_PATH = os.path.join(BASE_DIR, "unisphere.p12")

TARGET_URL = b"https://www.unisphere-ai.com"
OLD_URL = b"http://192.168.1.9:3005"

def patch_dex_url(dex_bytes: bytes, old_url: bytes, new_url: bytes) -> bytes:
    dex = bytearray(dex_bytes)
    delta = len(new_url) - len(old_url)
    
    string_ids_off = 112
    string_ids_size, = struct.unpack_from("<I", dex, 56)
    
    # 1. Trouver l'index de la chaîne
    target_idx = None
    target_off = None
    for i in range(string_ids_size):
        off, = struct.unpack_from("<I", dex, string_ids_off + i * 4)
        length = dex[off]
        s = dex[off + 1 : off + 1 + length]
        if s == old_url:
            target_idx = i
            target_off = off
            break
            
    if target_idx is None:
        raise ValueError(f"URL cible {old_url} non trouvée dans classes.dex")
        
    print(f"   🎯 URL trouvée à l'index {target_idx}, offset {target_off}")
    
    # Nouvelle chaîne : ULEB128(len) + string + 0x00
    new_str_bytes = bytes([len(new_url)]) + new_url + b"\x00"
    old_str_bytes_len = 1 + len(old_url) + 1
    
    # 2. Remplacer les octets de la chaîne
    prefix = dex[:target_off]
    suffix = dex[target_off + old_str_bytes_len:]
    new_dex = bytearray(prefix + new_str_bytes + suffix)
    
    # 3. Décaler les offsets des chaînes suivantes dans string_ids
    for i in range(target_idx + 1, string_ids_size):
        off, = struct.unpack_from("<I", new_dex, string_ids_off + i * 4)
        struct.pack_into("<I", new_dex, string_ids_off + i * 4, off + delta)
        
    # 4. Mettre à jour map_list
    map_off, = struct.unpack_from("<I", new_dex, 52)
    map_size, = struct.unpack_from("<I", new_dex, map_off + delta)
    for i in range(map_size):
        item_pos = (map_off + delta) + 4 + i * 12
        t_code, unused, count, off = struct.unpack_from("<HHII", new_dex, item_pos)
        if off > target_off:
            struct.pack_into("<I", new_dex, item_pos + 8, off + delta)
            
    # 5. Mettre à jour header (map_off et file_size)
    struct.pack_into("<I", new_dex, 52, map_off + delta)
    new_file_size = len(new_dex)
    struct.pack_into("<I", new_dex, 32, new_file_size)
    
    # 6. Recalculer SHA-1 et Adler-32
    sha1 = hashlib.sha1(new_dex[32:]).digest()
    new_dex[12:32] = sha1
    adler = zlib.adler32(new_dex[12:]) & 0xFFFFFFFF
    struct.pack_into("<I", new_dex, 8, adler)
    
    print(f"   ✅ DEX mis à jour avec succès : Taille={len(new_dex)} octets, SHA1={sha1.hex()}")
    return bytes(new_dex)

def build_apk():
    print(f"📦 [APK BUILD] Préparation de l'APK UniSphere AI pour : {TARGET_URL.decode()}...")
    
    # 1. Lire les fichiers originaux de l'APK
    with zipfile.ZipFile(APK_PATH, "r") as z:
        manifest_xml = z.read("AndroidManifest.xml")
        orig_dex = z.read("classes.dex")
        resources_arsc = z.read("resources.arsc")
        
    # 2. Patcher classes.dex
    new_dex = patch_dex_url(orig_dex, OLD_URL, TARGET_URL)
    
    # 3. Charger le certificat et la clé privée
    with open(P12_PATH, "rb") as f:
        priv_key, cert, addl = load_key_and_certificates(f.read(), b"unisphere2026")
        
    # 4. Calculer les SHA-256 des fichiers
    files = {
        "AndroidManifest.xml": manifest_xml,
        "classes.dex": new_dex,
        "resources.arsc": resources_arsc,
    }
    
    # Générer MANIFEST.MF
    manifest_lines = ["Manifest-Version: 1.0\r\n\r\n"]
    entry_digests = {}
    
    for name, content in files.items():
        digest = base64.b64encode(hashlib.sha256(content).digest()).decode("ascii")
        entry_text = f"Name: {name}\r\nSHA-256-Digest: {digest}\r\n\r\n"
        manifest_lines.append(entry_text)
        entry_digests[name] = base64.b64encode(hashlib.sha256(entry_text.encode("utf-8")).digest()).decode("ascii")
        
    manifest_mf = "".join(manifest_lines).encode("utf-8")
    manifest_digest = base64.b64encode(hashlib.sha256(manifest_mf).digest()).decode("ascii")
    
    # Générer CERT.SF
    sf_lines = [
        "Signature-Version: 1.0\r\n",
        "Created-By: 1.0 (Android)\r\n",
        f"SHA-256-Digest-Manifest: {manifest_digest}\r\n\r\n"
    ]
    for name, digest in entry_digests.items():
        sf_lines.append(f"Name: {name}\r\nSHA-256-Digest: {digest}\r\n\r\n")
    signature_sf = "".join(sf_lines).encode("utf-8")
    
    # Générer CERT.RSA (PKCS#7 signature détachée)
    rsa_sig = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(signature_sf)
        .add_signer(cert, priv_key, hashes.SHA256())
        .sign(Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature])
    )
    
    # 5. Écrire le nouvel APK
    backup_path = APK_PATH + ".bak"
    if not os.path.exists(backup_path):
        import shutil
        shutil.copy2(APK_PATH, backup_path)
        
    with zipfile.ZipFile(APK_PATH, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
        z_out.writestr("META-INF/MANIFEST.MF", manifest_mf)
        z_out.writestr("META-INF/CERT.SF", signature_sf)
        z_out.writestr("META-INF/CERT.RSA", rsa_sig)
        for name, content in files.items():
            z_out.writestr(name, content)
            
    print(f"🎉 APK de production généré avec succès dans : {APK_PATH} ({os.path.getsize(APK_PATH)} octets)")

if __name__ == "__main__":
    build_apk()
