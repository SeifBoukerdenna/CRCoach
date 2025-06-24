#!/usr/bin/env python3
import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# CONFIG
BASE_URL   = "https://royaleapi.com/cards/popular?time=7d&cat=GC&sort=rating&mode=grid"
OUTPUT_DIR = "cards"

def slugify(name: str) -> str:
    name = name.strip().lower()
    name = re.sub(r"[^\w\s-]", "", name)
    return re.sub(r"[\s_-]+", "_", name)

def fetch_card_list(session: requests.Session):
    resp = session.get(BASE_URL)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    cards = []
    for item in soup.select("div.grid_item"):
        evo = item.get("data-evo", "0")
        img = item.select_one("img.deck_card.ui.image")
        if not img:
            continue
        name = img["alt"]
        src  = img["src"]
        url  = urljoin(BASE_URL, src)
        cards.append((name, evo, url))
    return cards

def download_image(session: requests.Session, name: str, evo: str, url: str):
    ext = os.path.splitext(url)[1].split("?")[0] or ".png"
    base = slugify(name)
    # include evo only if non-zero
    fn = f"{base}{'_evo'+evo if evo!='0' else ''}{ext}"
    path = os.path.join(OUTPUT_DIR, fn)

    if os.path.exists(path):
        print(f"[skip] {fn} exists")
        return

    r = session.get(url, stream=True); r.raise_for_status()
    with open(path, "wb") as f:
        for chunk in r.iter_content(1024):
            f.write(chunk)
    print(f"[ok]   {fn}")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with requests.Session() as s:
        s.headers.update({"User-Agent": "Mozilla/5.0 (CardScraper/1.0)"})
        cards = fetch_card_list(s)
        print(f"Found {len(cards)} cards; downloading…")
        for name, evo, url in cards:
            download_image(s, name, evo, url)
    print("Done.")

if __name__ == "__main__":
    main()
