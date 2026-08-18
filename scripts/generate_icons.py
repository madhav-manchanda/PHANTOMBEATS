from PIL import Image
import os

def generate_icons():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.dirname(base_dir)
    logo_path = os.path.join(frontend_dir, 'public', 'assets', 'logo.png')
    icons_dir = os.path.join(frontend_dir, 'public', 'icons')

    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)

    try:
        with Image.open(logo_path) as img:
            # Convert to RGBA to preserve transparency
            img = img.convert("RGBA")

            sizes = [(192, 192), (512, 512)]
            for w, h in sizes:
                # Regular icon
                resized = img.resize((w, h), Image.Resampling.LANCZOS)
                resized.save(os.path.join(icons_dir, f'icon-{w}.png'), format="PNG")
                
                # Maskable icon (usually needs padding or background, but we'll use a padded version)
                # Create a solid background for maskable
                bg = Image.new('RGBA', (w, h), (0, 0, 0, 255))
                # Paste the resized logo in the center (scaled down a bit to be safe in the maskable safe zone)
                safe_zone_size = int(w * 0.8)
                safe_resized = img.resize((safe_zone_size, safe_zone_size), Image.Resampling.LANCZOS)
                
                offset = ((w - safe_zone_size) // 2, (h - safe_zone_size) // 2)
                bg.paste(safe_resized, offset, safe_resized)
                bg.save(os.path.join(icons_dir, f'maskable-{w}.png'), format="PNG")

            print("Icons generated successfully in public/icons/")
    except Exception as e:
        print(f"Error generating icons: {e}")

if __name__ == "__main__":
    generate_icons()
