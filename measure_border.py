import fitz
from PIL import Image
import numpy as np
import io

# Render SRS page at high DPI
doc = fitz.open(r'pdf/SafeNav SRS.pdf')
page = doc[0]

dpi = 200
mat = fitz.Matrix(dpi/72, dpi/72)
pix = page.get_pixmap(matrix=mat, alpha=False)
img_data = pix.tobytes("png")

img = Image.open(io.BytesIO(img_data)).convert("L")  # grayscale
arr = np.array(img)

print(f"Image size: {arr.shape}")  # rows x cols
print(f"Page size in pts: {page.rect.width} x {page.rect.height}")

# Look for dark pixels (border = black line) near edges
threshold = 100  # dark enough to be a border line

# Scan from top
for row in range(arr.shape[0]):
    if np.any(arr[row, 10:-10] < threshold):
        top_px = row
        break

# Scan from bottom
for row in range(arr.shape[0]-1, 0, -1):
    if np.any(arr[row, 10:-10] < threshold):
        bottom_px = row
        break

# Scan from left
for col in range(arr.shape[1]):
    if np.any(arr[10:-10, col] < threshold):
        left_px = col
        break

# Scan from right
for col in range(arr.shape[1]-1, 0, -1):
    if np.any(arr[10:-10, col] < threshold):
        right_px = col
        break

print(f"Border found at pixels - top:{top_px}, bottom:{bottom_px}, left:{left_px}, right:{right_px}")

# Convert pixels to points (pt = px * 72 / dpi)
scale = 72 / dpi
top_pt = top_px * scale
bottom_pt = (arr.shape[0] - bottom_px) * scale
left_pt = left_px * scale
right_pt = (arr.shape[1] - right_px) * scale

print(f"Border margins in points:")
print(f"  Top:    {top_pt:.2f} pt")
print(f"  Bottom: {bottom_pt:.2f} pt")
print(f"  Left:   {left_pt:.2f} pt")
print(f"  Right:  {right_pt:.2f} pt")
print(f"Approximate margin: ~{(top_pt+bottom_pt+left_pt+right_pt)/4:.2f} pt avg")

# Now check a middle row for the border line thickness
mid_col = arr.shape[1] // 2
col_slice = arr[:, left_px-2:left_px+5]
print(f"\nPixel values near left border (col {left_px}):")
print(col_slice[:5, :])
