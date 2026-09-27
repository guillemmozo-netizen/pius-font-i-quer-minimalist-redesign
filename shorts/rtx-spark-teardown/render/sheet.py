"""Hoja de contactos de los fotogramas de build/stills: python render/sheet.py out.png [cols]"""
import sys, glob, os
from PIL import Image, ImageDraw
files = sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'build', 'stills', '*.png')))
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 5
ims = [Image.open(f) for f in files]
w, h = ims[0].size
tw, th = w // 2, h // 2
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * th), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * tw, (i // cols) * th
    sheet.paste(im.resize((tw, th)), (x, y))
    d.text((x + 6, y + 6), os.path.basename(f), fill=(255, 255, 0))
sheet.save(sys.argv[1])
print(sheet.size)
