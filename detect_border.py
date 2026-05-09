import fitz

doc = fitz.open(r'pdf/SafeNav SRS.pdf')
page = doc[0]

# Get drawings/paths on the page
drawings = page.get_drawings()
print("Number of drawings on page 0:", len(drawings))
for i, d in enumerate(drawings[:10]):
    print("Drawing", i)
    print("  type:", d.get("type"))
    print("  color:", d.get("color"))
    print("  fill:", d.get("fill"))
    print("  width:", d.get("width"))
    print("  rect:", d.get("rect"))
    print()

print("Page size:", page.rect)
