from pathlib import Path
lines = Path('src/app/admin/password/page.tsx').read_text('utf-8').splitlines()
start = 575
end = 635
for i, line in enumerate(lines[start:end], start=start+1):
    print(f'{i:04}: {line!r}')
