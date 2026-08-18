"""scripts/rescale-type.py — lift v11.css's tiny type onto a legible scale.

v11's globals were authored at 5–11px for most labels and copy, which reads as "very tiny" at desktop sizes.
This maps every px font-size below 18px onto 10–18px (monotone, so hierarchy is preserved) and leaves
headings alone. Mock-UI selectors inside the marketing site (platform window, phone mock, control panel)
are skipped — they are miniature by design.

Run once against src/styles/v11.css (idempotent: sizes already >= 10 for x<18 map close to themselves — so
DON'T run twice; git shows whether it has been applied: look for 'rescaled' marker on line 1).
"""
import re, sys, pathlib

p = pathlib.Path(__file__).resolve().parent.parent / "src" / "styles" / "v11.css"
css = p.read_text(encoding="utf8")
if css.startswith("/* rescaled"):
    print("already rescaled; nothing to do"); sys.exit(0)

SKIP = ("platform-", "phone-", "mini-", "mock", "marquee", "hero-platform", "control-", "readiness-meter",
        "score-eyebrow", "letter-ready", "return-", "invite-chip", "float-", "b2b-trust img")

def f(x: float) -> float:
    if x >= 18 or x <= 0: return x
    y = 10 + (x - 4) * 8 / 14
    return round(y * 2) / 2

def fmt(v: float) -> str:
    return (str(int(v)) if float(v).is_integer() else str(v))

def rescale_decls(decls: str) -> str:
    def rep_fs(m):
        x = float(m.group(1)); return f"font-size:{fmt(f(x))}px{m.group(2) or ''}"
    decls = re.sub(r"font-size:([0-9.]+)px(!important)?", rep_fs, decls)
    def rep_font(m):
        pre, x, post = m.group(1), float(m.group(2)), m.group(3)
        return f"font:{pre}{fmt(f(x))}px{post}"
    decls = re.sub(r"font:([^;}]*?)([0-9.]+)px((?:/[0-9.]+)?\s+[^;}]*)", rep_font, decls)
    return decls

out = []
pos = 0
n = 0
for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
    sel, decls = m.group(1), m.group(2)
    out.append(css[pos:m.start()])
    if any(s in sel for s in SKIP) or "font" not in decls:
        out.append(m.group(0))
    else:
        new = rescale_decls(decls)
        if new != decls: n += 1
        out.append(f"{sel}{{{new}}}")
    pos = m.end()
out.append(css[pos:])
p.write_text("/* rescaled: type lifted onto a 10–18px floor by scripts/rescale-type.py */\n" + "".join(out), encoding="utf8")
print(f"rescaled {n} rules")
