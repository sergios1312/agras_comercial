from PIL import Image
import base64, io

img = Image.open(r'C:\Users\s_ara\OneDrive\Escritorio\Proyectos\agras_comercial\DJI_AGRICULTURE_LOGO.webp').convert('RGBA')
print(f'Size: {img.size}')

buf = io.BytesIO()
img.save(buf, format='PNG')
b64 = base64.b64encode(buf.getvalue()).decode()

out_path = r'C:\Users\s_ara\OneDrive\Escritorio\Proyectos\agras_comercial\src\components\cotizaciones\logo-base64.ts'
with open(out_path, 'w') as f:
    f.write('// Auto-generated: DJI Agriculture logo as base64 PNG\n')
    f.write('export const DJI_LOGO_BASE64 = "data:image/png;base64,' + b64 + '";\n')

print(f'Base64 length: {len(b64)}')
print('Done')
