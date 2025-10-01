#!/usr/bin/env python3
"""Generate simple PNG icons for the Chrome extension"""

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("PIL/Pillow not installed. Install with: pip install Pillow")
    print("\nAlternatively, use the SVG files or create icons manually.")
    exit(1)

def create_icon(size):
    """Create a simple egg-shaped icon with 'A' for 'activated'"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Calculate dimensions
    margin = size // 8
    egg_width = size - (2 * margin)
    egg_height = int(egg_width * 1.25)

    # Center the egg
    left = margin
    top = (size - egg_height) // 2
    right = left + egg_width
    bottom = top + egg_height

    # Draw egg shape (ellipse) with green gradient effect
    # Main egg body
    draw.ellipse(
        [left, top, right, bottom],
        fill=(76, 175, 80, 255),  # Green
        outline=(27, 94, 32, 255),  # Dark green
        width=max(1, size // 32)
    )

    # Highlight
    highlight_left = left + egg_width // 4
    highlight_top = top + egg_height // 4
    highlight_right = highlight_left + egg_width // 4
    highlight_bottom = highlight_top + egg_height // 3
    draw.ellipse(
        [highlight_left, highlight_top, highlight_right, highlight_bottom],
        fill=(255, 255, 255, 76)  # Semi-transparent white
    )

    # Draw letter 'A' for "activated"
    if size >= 32:
        try:
            # Try to use a nice font
            font_size = size // 2
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            # Fallback to default font
            font = ImageFont.load_default()

        text = "A"
        # Get text size for centering
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2 + size // 16

        # Draw text with outline
        outline_color = (27, 94, 32, 255)  # Dark green
        for adj_x in [-1, 1]:
            for adj_y in [-1, 1]:
                draw.text((text_x + adj_x, text_y + adj_y), text, font=font, fill=outline_color)

        draw.text((text_x, text_y), text, font=font, fill=(255, 255, 255, 255))

    return img

# Generate icons
sizes = [16, 48, 128]
for size in sizes:
    icon = create_icon(size)
    icon.save(f'icon{size}.png')
    print(f'Created icon{size}.png')

print('\nIcons created successfully!')
