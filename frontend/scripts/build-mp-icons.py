from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src/static/icons"
OUTPUT_DIR = ROOT / "src/static/icons-mp"

PALETTE = [
    ("031632", "#031632"),
    ("1f2f4d", "#1f2f4d"),
    ("44474d", "#44474d"),
    ("4b5360", "#4b5360"),
    ("6a5d43", "#6a5d43"),
    ("75777e", "#75777e"),
    ("9c7836", "#9c7836"),
    ("f0debd", "#f0debd"),
    ("f3e0c0", "#f3e0c0"),
    ("ffffff", "#ffffff"),
    ("ffffff-a64", "rgba(255,255,255,0.64)"),
]


def icon_html(svg: str, color: str) -> str:
    return f"""
<!doctype html>
<html>
  <head>
    <style>
      html, body {{
        width: 96px;
        height: 96px;
        margin: 0;
        background: transparent;
        overflow: hidden;
      }}
      #icon {{
        width: 96px;
        height: 96px;
        color: {color};
        display: flex;
        align-items: center;
        justify-content: center;
      }}
      #icon svg {{
        width: 96px;
        height: 96px;
        display: block;
      }}
    </style>
  </head>
  <body>
    <div id="icon">{svg}</div>
  </body>
</html>
"""


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for path in OUTPUT_DIR.glob("*.png"):
        path.unlink()

    icons = sorted(SOURCE_DIR.glob("*.svg"))
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 96, "height": 96}, device_scale_factor=1)

        for icon in icons:
            svg = icon.read_text(encoding="utf-8")
            name = icon.stem
            for key, color in PALETTE:
                page.set_content(icon_html(svg, color))
                page.locator("#icon").screenshot(
                    path=str(OUTPUT_DIR / f"{name}-{key}.png"),
                    omit_background=True,
                )

        browser.close()

    print(f"Generated {len(icons) * len(PALETTE)} mini-program icon PNGs.")


if __name__ == "__main__":
    main()
