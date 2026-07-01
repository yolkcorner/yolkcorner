from pathlib import Path
path = Path('src/app/admin/password/page.tsx')
lines = path.read_text(encoding='utf-8').splitlines()
for i in range(400, 640):
    print(f'{i+1:4}: {lines[i]}')
