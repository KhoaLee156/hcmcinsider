"""Prepare phone photos for a story: resize, strip ALL metadata (GPS location, phone model), save as web JPEGs.

  python3 tools/add_photos.py <story-slug> photo1.jpg photo2.heic ...

Writes assets/stories/<slug>/01.jpg, 02.jpg ... (max 1600 px, quality 82) and prints the paths to put in stories.json.
"""
import os, sys
from PIL import Image, ImageOps

try:
    from pillow_heif import register_heif_opener  # iPhone HEIC photos
    register_heif_opener()
except ImportError:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    slug, files = sys.argv[1], sys.argv[2:]
    out = os.path.join(ROOT, "assets", "stories", slug)
    os.makedirs(out, exist_ok=True)
    start = len([f for f in os.listdir(out) if f.endswith(".jpg")])
    for n, f in enumerate(files, start + 1):
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        im.thumbnail((1600, 1600))
        dst = os.path.join(out, "%02d.jpg" % n)
        clean = Image.new("RGB", im.size)
        clean.paste(im)  # new image = no EXIF, no GPS
        clean.save(dst, "JPEG", quality=82, optimize=True, progressive=True)
        print("/assets/stories/%s/%02d.jpg  %dx%d" % (slug, n, im.size[0], im.size[1]))


if __name__ == "__main__":
    main()
