from pathlib import Path
import typescript as ts

file = Path('src/app/admin/password/page.tsx')
text = file.read_text('utf8')
source = ts.createSourceFile(str(file), text, ts.ScriptTarget.Latest, True, ts.ScriptKind.TSX)
print('diagnostics', len(source.parseDiagnostics))
for d in source.parseDiagnostics:
    msg = d.messageText
    if isinstance(msg, dict):
        msg = msg['messageText']
    pos = source.getLineAndCharacterOfPosition(d.start)
    print('line', pos.line + 1, 'char', pos.character + 1, 'message', msg)
