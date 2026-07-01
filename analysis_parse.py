from pathlib import Path
import re
path = Path('src/app/admin/password/page.tsx')
text = path.read_text(encoding='utf-8')
print('length', len(text))
for needle in ['{managingAlbum && (', '{confirmState && (', '</AdminSectionLayout>']:
    idx = text.find(needle)
    print(needle, idx, 'line', text.count('\n', 0, idx)+1)

# Print a chunk around the invalid region
start = text.find('{managingAlbum && (')
end = text.find('{confirmState && (', start)
if end == -1:
    end = len(text)
print('--- managingAlbum chunk ---')
print(text[start:end])
print('--- end chunk ---')

# Check simple brace/paren balance by scanning lines around the chunk
lines = text.splitlines()
for i in range(text.count('\n', 0, start), min(text.count('\n', 0, end)+20, len(lines))):
    print(f'{i+1:4}: {lines[i]}')
