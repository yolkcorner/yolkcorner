const fs = require("fs");
const ts = require("typescript");
const file = "src/app/admin/password/page.tsx";
const text = fs.readFileSync(file, "utf8");
const sf = ts.createSourceFile(
  file,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
console.log("diagnostics", sf.parseDiagnostics.length);
for (const d of sf.parseDiagnostics) {
  const msg =
    typeof d.messageText === "string"
      ? d.messageText
      : d.messageText.messageText;
  const pos = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(`${pos.line + 1}:${pos.character + 1} ${msg}`);
}
