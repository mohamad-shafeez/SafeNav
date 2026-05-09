import fitz
from PIL import Image
import numpy as np
import io

# Render SRS page at very high DPI to measure line thickness
doc = fitz.open(r'pdf/SafeNav SRS.pdf')
page = doc[0]

dpi = 300
mat = fitz.Matrix(dpi/72, dpi/72)
pix = page.get_pixmap(matrix=mat, alpha=False)
img_data = pix.tobytes("png")

img = Image.open(io.BytesIO(img_data)).convert("L")
arr = np.array(img)

scale = 72 / dpi

# Find top border row
for row in range(arr.shape[0]):
    if np.any(arr[row, 20:-20] < 100):
        top_px = row
        break

# Measure thickness - count consecutive dark rows
thickness = 0
for row in range(top_px, min(top_px + 20, arr.shape[0])):
    mid = arr.shape[1] // 2
    if arr[row, mid] < 100:
        thickness += 1
    else:
        break

print(f"Border line thickness: {thickness} pixels at {dpi} DPI")
print(f"In points: {thickness * scale:.2f} pt")
print(f"Top border starts at pixel row: {top_px}")
print(f"Top border in points: {top_px * scale:.2f} pt")

# Check the actual pixel values at the border
col = arr.shape[1] // 2
print(f"\nPixel values at column {col}, rows {top_px-2} to {top_px+8}:")
for r in range(max(0, top_px-2), min(top_px+8, arr.shape[0])):
    print(f"  row {r}: {arr[r, col]}")
