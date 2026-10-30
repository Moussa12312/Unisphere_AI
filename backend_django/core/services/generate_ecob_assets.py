import math
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def generate_ecob_assets():
    static_dir = Path(__file__).resolve().parent.parent / "static" / "ecob"
    static_dir.mkdir(parents=True, exist_ok=True)

    # 1. ecolB Logo
    w, h = 500, 160
    logo_img = Image.new('RGBA', (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(logo_img)

    try:
        font_main = ImageFont.truetype("arialbd.ttf", 62)
        font_sub = ImageFont.truetype("ariali.ttf", 18)
    except Exception:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    # ecol in dark navy/black
    draw.text((100, 15), "ecol", fill=(10, 20, 40, 255), font=font_main)
    # B in dark navy/black
    draw.text((230, 15), "B", fill=(10, 20, 40, 255), font=font_main)
    # Red accent above B
    draw.ellipse([(265, 8), (280, 22)], fill=(220, 38, 38, 255))
    draw.line([(262, 14), (282, 28)], fill=(220, 38, 38, 255), width=3)
    draw.line([(270, 8), (292, 14)], fill=(220, 38, 38, 255), width=2)

    # Subtitle in red
    draw.text((102, 90), "Ecole de Business Bilingue", fill=(185, 28, 28, 255), font=font_sub)

    logo_path = static_dir / "ecob_logo.png"
    logo_img.save(str(logo_path), "PNG")

    # 2. Official Blue Stamp
    sw, sh = 400, 400
    stamp_img = Image.new('RGBA', (sw, sh), (255, 255, 255, 0))
    sdraw = ImageDraw.Draw(stamp_img)

    blue_stamp = (24, 72, 160, 230)
    
    # Outer double circles
    sdraw.ellipse([(20, 20), (380, 380)], outline=blue_stamp, width=5)
    sdraw.ellipse([(34, 34), (366, 366)], outline=blue_stamp, width=2)
    sdraw.ellipse([(80, 80), (320, 320)], outline=blue_stamp, width=2)

    try:
        font_arc = ImageFont.truetype("arialbd.ttf", 20)
        font_center = ImageFont.truetype("arialbd.ttf", 24)
        font_dir = ImageFont.truetype("ariali.ttf", 18)
        font_sub2 = ImageFont.truetype("arialbd.ttf", 15)
    except Exception:
        font_arc = ImageFont.load_default()
        font_center = ImageFont.load_default()
        font_dir = ImageFont.load_default()
        font_sub2 = ImageFont.load_default()

    # Curved arc text simulation (circular positioning)
    text_top = "ECOLE DE BUSINESS BILINGUE"
    r_top = 150
    cx, cy = 200, 200
    angle_start = -140
    angle_end = -40
    total_chars = len(text_top)
    angle_step = (angle_end - angle_start) / max(total_chars - 1, 1)

    for i, ch in enumerate(text_top):
        curr_angle = angle_start + (i * angle_step)
        rad = math.radians(curr_angle)
        x = cx + r_top * math.cos(rad) - 8
        y = cy + r_top * math.sin(rad) - 8
        sdraw.text((x, y), ch, fill=blue_stamp, font=font_arc)

    # Center texts
    sdraw.text((145, 125), "ECOB", fill=blue_stamp, font=font_center)
    sdraw.text((120, 165), "★ Le Directeur ★", fill=blue_stamp, font=font_dir)
    sdraw.text((125, 200), "BAMAKO - MALI", fill=blue_stamp, font=font_sub2)

    # Bottom arc phone
    text_bottom = "Tél: 67 66 66 37 / 79 32 19 84"
    r_bottom = 152
    angle_b_start = 145
    angle_b_end = 35
    b_step = (angle_b_end - angle_b_start) / max(len(text_bottom) - 1, 1)
    for i, ch in enumerate(text_bottom):
        curr_angle = angle_b_start + (i * b_step)
        rad = math.radians(curr_angle)
        x = cx + r_bottom * math.cos(rad) - 6
        y = cy + r_bottom * math.sin(rad) - 6
        sdraw.text((x, y), ch, fill=blue_stamp, font=font_sub2)

    # Overlay signature flourish (dynamic blue pen stroke)
    sig_blue = (15, 45, 140, 245)
    points = [
        (80, 210), (120, 150), (145, 230), (170, 160), (205, 175),
        (240, 140), (260, 185), (225, 220), (170, 235), (280, 225), (320, 215)
    ]
    sdraw.line(points, fill=sig_blue, width=4)
    sdraw.line([(100, 215), (290, 195)], fill=sig_blue, width=3)
    sdraw.arc([(160, 130), (250, 210)], start=20, end=340, fill=sig_blue, width=3)

    stamp_path = static_dir / "ecob_stamp.png"
    stamp_img.save(str(stamp_path), "PNG")
    print(f"ECOB Assets saved to {static_dir}")

if __name__ == "__main__":
    generate_ecob_assets()
