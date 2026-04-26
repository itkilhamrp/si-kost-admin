// build-css.cjs — Bundle + optional minify CSS
//
// Usage:
//   node build-css.cjs        → src/css/styles.bundle.css  (readable)
//   node build-css.cjs --min  → src/css/styles.bundle.min.css (minified)

const fs    = require("fs");
const path  = require("path");

const isMin   = process.argv.includes("--min");
const CSS_DIR = path.join(__dirname, "src/css");

const PARTIALS = [
  "_base.css",
  "_cards.css",
  "_components.css",
  "_pages.css",
];

// ── Minifier yang aman ─────────────────────────────────────────
function minify(css) {
  return css
    // Hapus komentar
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Normalisasi newline
    .replace(/\r\n/g, "\n")
    // Hapus leading/trailing whitespace per baris
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    // Collapse newline + whitespace jadi satu spasi
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    // Hapus spasi di sekitar { } ; ,
    .replace(/ *\{ */g, "{")
    .replace(/ *\} */g, "}")
    .replace(/ *; */g, ";")
    .replace(/ *, */g, ",")
    // Hapus spasi di sekitar : hanya di dalam blok deklarasi
    .replace(/\{([^}]+)\}/g, (match) => match.replace(/ *: */g, ":"))
    // Hapus ; sebelum }
    .replace(/;}/g, "}")
    // Hapus baris/spasi kosong berlebih
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// ── Baca & gabungkan ───────────────────────────────────────────
let base = fs.readFileSync(path.join(CSS_DIR, "styles.css"), "utf8");
base = base.split("\n")
  .filter(l => !l.trim().startsWith("@import"))
  .join("\n");

const parts = PARTIALS.map(f => {
  const content = fs.readFileSync(path.join(CSS_DIR, f), "utf8");
  return isMin
    ? content
    : `\n/* ════ ${f} ════ */\n${content}`;
});

const combined = [base, ...parts].join("\n");

// ── Tulis output ───────────────────────────────────────────────
const output  = isMin ? minify(combined) : combined;
const outFile = isMin ? "styles.bundle.min.css" : "styles.bundle.css";
const outPath = path.join(CSS_DIR, outFile);

fs.writeFileSync(outPath, output, "utf8");

const origKB = (Buffer.byteLength(combined, "utf8") / 1024).toFixed(1);
const outKB  = (Buffer.byteLength(output,   "utf8") / 1024).toFixed(1);
const pct    = (((combined.length - output.length) / combined.length) * 100).toFixed(1);

console.log(`✅  ${outFile} dibuat`);
console.log(`    Original : ${origKB} KB`);
console.log(`    Output   : ${outKB} KB`);
if (isMin) console.log(`    Hemat    : ${pct}%`);
