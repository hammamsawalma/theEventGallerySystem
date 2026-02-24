import glob

files = [
    "src/app/raw-items/page.tsx",
    "src/app/manufacturing/page.tsx",
    "src/app/kits/page.tsx",
    "src/app/orders/OrdersListClient.tsx",
    "src/app/sales/page.tsx"
]

import_statement = "import { ImagePreview } from \"@/components/ui/image-preview\";\n"

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    if "<img src=" in content and "ImagePreview" not in content:
        # Avoid double imports
        content = content.replace("<img src=", "<ImagePreview src=")
        
        # Add import after the last import statement or at top
        if "ImagePreview" not in content:
            lines = content.split('\n')
            last_import_idx = -1
            for i, line in enumerate(lines):
                if line.startswith("import "):
                    last_import_idx = i
            
            if last_import_idx != -1:
                lines.insert(last_import_idx + 1, import_statement.strip())
            else:
                lines.insert(0, import_statement.strip())
            content = '\n'.join(lines)
            
        with open(f, 'w') as file:
            file.write(content)
        print(f"Updated {f}")

