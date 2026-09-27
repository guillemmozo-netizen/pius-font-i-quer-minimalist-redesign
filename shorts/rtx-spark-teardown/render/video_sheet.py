"""Hoja de contactos de un vídeo: python render/video_sheet.py video.mkv out.png t1 t2 ... (cols=8)"""
import subprocess, sys, io
from PIL import Image, ImageDraw
video, out, *ts = sys.argv[1:]
ims = []
for t in ts:
    png = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', t, '-i', video, '-frames:v', '1', '-vf', 'scale=270:-2', '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True).stdout
    ims.append((t, Image.open(io.BytesIO(png)).convert('RGB')))
cols = 8
w, h = ims[0][1].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), (30, 30, 30))
d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(ims):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    d.text((x + 5, y + 5), f'{t}s', fill=(255, 255, 0))
sheet.save(out)
print(sheet.size)
