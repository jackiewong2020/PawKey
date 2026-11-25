#!/usr/bin/env python3
"""Generate 100% original PawKey 2.1 macOS AppIcon (Sleek Agile Tuxedo Cat + Studio Keyboard) & Tray Icon."""
import os
import subprocess
import tempfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(ASSETS, exist_ok=True)


def render_app_icon_svg_via_chrome(out_png):
    svg = """<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:1024px;height:1024px;background:transparent;overflow:hidden;}
svg{display:block;width:1024px;height:1024px;}
</style></head><body>
<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDFBF7"/>
      <stop offset="100%" stop-color="#EEEAE2"/>
    </linearGradient>
    <radialGradient id="fur" cx="44%" cy="36%" r="58%">
      <stop offset="0%" stop-color="#3C373D"/>
      <stop offset="68%" stop-color="#252226"/>
      <stop offset="100%" stop-color="#181619"/>
    </radialGradient>
    <filter id="cardShadow" x="-15%" y="-10%" width="130%" height="135%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#1D1D1F" flood-opacity="0.16"/>
    </filter>
    <filter id="kbShadow" x="-15%" y="-15%" width="130%" height="145%">
      <feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#1D1D1F" flood-opacity="0.18"/>
    </filter>
  </defs>

  <!-- macOS Sequoia Squircle Plate -->
  <g filter="url(#cardShadow)">
    <rect x="92" y="92" width="840" height="840" rx="192" fill="url(#bg)"/>
    <rect x="94" y="94" width="836" height="836" rx="190" fill="none" stroke="#FFFFFF" stroke-opacity="0.88" stroke-width="4"/>
    <rect x="92" y="92" width="840" height="840" rx="192" fill="none" stroke="#000000" stroke-opacity="0.06" stroke-width="2"/>
  </g>

  <!-- Bouncy Ahoge -->
  <path d="M512 292 C504 222 578 198 588 250" fill="none" stroke="#181619" stroke-width="22" stroke-linecap="round"/>

  <!-- Perked Agile Cat Ears -->
  <g transform="translate(362 340) rotate(-16)">
    <path d="M-74 42 Q-46 -96 0 -134 Q46 -96 74 42 Z" fill="url(#fur)" stroke="#161315" stroke-width="18" stroke-linejoin="round"/>
    <path d="M-40 20 Q-22 -60 0 -88 Q22 -60 40 20 Z" fill="#73535A"/>
  </g>
  <g transform="translate(662 340) rotate(16)">
    <path d="M-74 42 Q-46 -96 0 -134 Q46 -96 74 42 Z" fill="url(#fur)" stroke="#161315" stroke-width="18" stroke-linejoin="round"/>
    <path d="M-40 20 Q-22 -60 0 -88 Q22 -60 40 20 Z" fill="#73535A"/>
  </g>

  <!-- Sleek Oval Cat Head -->
  <path d="M512 290 C678 290 778 380 780 494 C782 606 676 664 512 664 C348 664 242 606 244 494 C246 380 346 290 512 290 Z" fill="url(#fur)" stroke="#161315" stroke-width="18"/>

  <!-- Lively Almond-Oval Golden Cat Eyes -->
  <g transform="translate(414 484) rotate(5)">
    <ellipse cx="0" cy="0" rx="64" ry="48" fill="#F6BE3B" stroke="#161315" stroke-width="6"/>
    <ellipse cx="4" cy="0" rx="25" ry="35" fill="#181516"/>
    <circle cx="-10" cy="-14" r="12" fill="#FFFFFF"/>
    <circle cx="15" cy="12" r="5.5" fill="#FFFFFF"/>
  </g>
  <g transform="translate(610 484) rotate(-5)">
    <ellipse cx="0" cy="0" rx="64" ry="48" fill="#F6BE3B" stroke="#161315" stroke-width="6"/>
    <ellipse cx="-4" cy="0" rx="25" ry="35" fill="#181516"/>
    <circle cx="-18" cy="-14" r="12" fill="#FFFFFF"/>
    <circle cx="7" cy="12" r="5.5" fill="#FFFFFF"/>
  </g>

  <!-- Dainty Blush Flicks, Whiskers, Petite Nose & Smile -->
  <path d="M352 544 L374 535 M650 535 L672 544" stroke="#F48CA0" stroke-width="10" stroke-linecap="round"/>
  <g stroke="#EAE6E0" stroke-opacity="0.72" stroke-width="6.5" stroke-linecap="round" fill="none">
    <path d="M356 544 Q286 538 230 558"/>
    <path d="M356 568 Q286 574 234 596"/>
    <path d="M668 544 Q738 538 794 558"/>
    <path d="M668 568 Q738 574 790 596"/>
  </g>
  <ellipse cx="512" cy="528" rx="16" ry="11" fill="#F394A4"/>
  <path d="M476 552 Q494 574 512 554 Q530 574 548 552" fill="none" stroke="#F7C9D1" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Collar & Gold Bell -->
  <path d="M436 668 Q512 694 588 668" fill="none" stroke="#EE5D48" stroke-width="24" stroke-linecap="round"/>
  <circle cx="512" cy="692" r="28" fill="#F8C43A" stroke="#161315" stroke-width="10"/>

  <!-- Sleek Minimalist Aluminum Mechanical Keyboard -->
  <g filter="url(#kbShadow)">
    <rect x="202" y="718" width="620" height="142" rx="30" fill="#232327"/>
    <rect x="206" y="714" width="612" height="132" rx="28" fill="#2E2E34" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>
    <rect x="232" y="738" width="130" height="84" rx="18" fill="#CC4312"/>
    <rect x="232" y="730" width="130" height="80" rx="18" fill="#FF5A1F"/>
    <rect x="380" y="738" width="278" height="84" rx="18" fill="#D4D2CC"/>
    <rect x="380" y="730" width="278" height="80" rx="18" fill="#FFFFFF"/>
    <rect x="676" y="738" width="114" height="84" rx="18" fill="#D4D2CC"/>
    <rect x="676" y="730" width="114" height="80" rx="18" fill="#F2F0EB"/>
  </g>

  <!-- Neat White Mitten Paws -->
  <ellipse cx="360" cy="726" rx="60" ry="44" fill="#FFFDF8" stroke="#161315" stroke-width="16"/>
  <ellipse cx="664" cy="726" rx="60" ry="44" fill="#FFFDF8" stroke="#161315" stroke-width="16"/>
</svg>
</body></html>"""
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    with tempfile.TemporaryDirectory() as td:
        html_path = os.path.join(td, "icon.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(svg)
        subprocess.run([
            chrome, "--headless=new", "--no-sandbox",
            f"--user-data-dir={os.path.join(td, 'prof')}",
            "--default-background-color=00000000",
            "--window-size=1024,1024", "--force-device-scale-factor=1",
            f"--screenshot={out_png}", f"file://{html_path}"
        ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=25)


def make_icns(png_1024, out_icns):
    img = Image.open(png_1024).convert("RGBA")
    with tempfile.TemporaryDirectory() as td:
        iconset = os.path.join(td, "AppIcon.iconset")
        os.makedirs(iconset)
        for sz in [16, 32, 128, 256, 512]:
            img.resize((sz, sz), Image.LANCZOS).save(os.path.join(iconset, f"icon_{sz}x{sz}.png"))
            img.resize((sz * 2, sz * 2), Image.LANCZOS).save(os.path.join(iconset, f"icon_{sz}x{sz}@2x.png"))
        subprocess.run(["iconutil", "-c", "icns", iconset, "-o", out_icns], check=True)


def make_tray_icons():
    S = 144
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.polygon([(28, 62), (24, 22), (56, 42)], fill=(0, 0, 0, 255))
    d.polygon([(116, 62), (120, 22), (88, 42)], fill=(0, 0, 0, 255))
    d.ellipse([20, 40, 124, 122], fill=(0, 0, 0, 255))
    d.ellipse([42, 70, 64, 88], fill=(0, 0, 0, 0))
    d.ellipse([80, 70, 102, 88], fill=(0, 0, 0, 0))
    d.arc([58, 86, 86, 108], 15, 165, fill=(0, 0, 0, 0), width=7)
    im.resize((36, 36), Image.LANCZOS).save(os.path.join(ASSETS, "tray-icon@2x.png"))
    im.resize((18, 18), Image.LANCZOS).save(os.path.join(ASSETS, "tray-icon.png"))


if __name__ == "__main__":
    p1024 = os.path.join(ASSETS, "app-icon-1024.png")
    render_app_icon_svg_via_chrome(p1024)
    make_icns(p1024, os.path.join(ASSETS, "AppIcon.icns"))
    make_tray_icons()
    print("Generated PawKey 2.1 AppIcon.icns & tray icons cleanly!")
