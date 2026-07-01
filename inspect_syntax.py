from pathlib import Path
text = Path('src/app/admin/password/page.tsx').read_text('utf-8')
lines = text.splitlines()
print('Total lines', len(lines))
for i in range(550, 635):
    print(f'{i+1}: {lines[i]}')
stack = []
in_s = in_d = in_b = esc = False
for idx, ch in enumerate(text):
    if ch == '\n':
        pass
    if esc:
        esc = False
        continue
    if ch == '\\':
        esc = True
        continue
    if in_s:
        if ch == "'":
            in_s = False
        continue
    if in_d:
        if ch == '"':
            in_d = False
        continue
    if in_b:
        if ch == '`':
            in_b = False
        continue
    if ch == "'":
        in_s = True
        continue
    if ch == '"':
        in_d = True
        continue
    if ch == '`':
        in_b = True
        continue
    if ch in '({[':
        stack.append((ch, text[:idx].count('\n')+1))
    elif ch in ')}]':
        if not stack:
            print('unmatched', ch, 'at', text[:idx].count('\n')+1)
            break
        top, l = stack[-1]
        if (top, ch) in [('(', ')'), ('{', '}'), ('[', ']')]:
            stack.pop()
        else:
            print('mismatch', top, 'from', l, 'with', ch, 'at', text[:idx].count('\n')+1)
            break
print('final stack length', len(stack))
print('stack tail', stack[-10:])
