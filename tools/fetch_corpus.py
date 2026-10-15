#!/usr/bin/env python3
"""Refresh public-domain benchmark excerpts; proprietary sources stay URL-only."""
import html
from http.client import IncompleteRead
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
import socket
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SOURCES = ROOT / "tests/corpus/sources.json"
OUTPUT = ROOT / "tests/corpus/long-fixtures.json"
MAX_CHARS = 24000


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0
        self.blocked = {"script", "style", "nav", "footer", "aside"}
        self.stack = []

    def handle_starttag(self, tag, attrs):
        self.stack.append(tag)
        if tag in self.blocked:
            self.hidden += 1
        if tag in {"p", "h1", "h2", "h3", "li"} and not self.hidden:
            self.parts.append(" ")

    def handle_endtag(self, tag):
        if tag in self.blocked and self.hidden:
            self.hidden -= 1
        if self.stack:
            self.stack.pop()
        if tag in {"p", "h1", "h2", "h3", "li"} and not self.hidden:
            self.parts.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.parts.append(data)


def extract(source, raw):
    if source["format"] == "gutenberg":
        start = raw.find(source["start"])
        if start < 0:
            raise ValueError(f"Missing book start marker: {source['id']}")
        end = raw.find(source["end"], start) if source.get("end") else len(raw)
        if end < 0 and len(raw) - start < MAX_CHARS:
            raise ValueError(f"Missing book end marker: {source['id']}")
        if end < 0:
            end = len(raw)
        body = raw[start:end]
        body = re.sub(r"\[Illustration[^\]]*\]", " ", body, flags=re.I)
    else:
        if source["format"] == "cdc-mmwr":
            start = raw.find('<a id="abstract"')
            end = raw.find('<div class="order-4 w-100"><p>Corresponding author:', start)
            if end < 0:
                end = raw.find('<h2><a id="References"', start)
            if start < 0 or end < 0:
                raise ValueError(f"Missing MMWR section boundaries: {source['id']}")
            body = raw[start:end]
            body = re.sub(r'<div class="order-4 w-100"><div>\s*<h2><a id="(?!abstract|introduction|methods|results|discussion)[^"]+".*?</div></div>', ' ', body, flags=re.S | re.I)
            body = re.sub(r'<div class="order-4"><p class="text-right">.*?</p></div>', ' ', body, flags=re.S)
            body = re.sub(r'<a [^>]*href="[^"]+"[^>]*>https?://.*?</a>', ' ', body, flags=re.S)
        elif source["format"] == "python-pep":
            start = raw.find('<section id="introduction">')
            end = raw.find('<section id="references">', start)
            if start < 0 or end < 0:
                raise ValueError(f"Missing PEP sections: {source['id']}")
            body = raw[start:end]
            body = re.sub(r'<pre\b[^>]*>.*?</pre>', ' ', body, flags=re.S | re.I)
            body = re.sub(r'<code\b[^>]*>.*?</code>', ' ', body, flags=re.S | re.I)
            body = re.sub(r'<nav\b[^>]*>.*?</nav>', ' ', body, flags=re.S | re.I)
        elif source["format"] == "nih-health":
            start = raw.find('<main')
            end = raw.find('</main>', start)
            if start < 0:
                raise ValueError(f"Missing NIH article: {source['id']}")
            body = raw[start:end]
            body = re.sub(r'<ol[^>]*>.*?</ol>', ' ', body, flags=re.S)
            body = re.sub(r'<a [^>]*href="[^"]+"[^>]*>https?://.*?</a>', ' ', body, flags=re.S)
        else:
            start = raw.find('<main')
            end = raw.find('</main>', start)
            if start < 0 or end < 0:
                raise ValueError(f"Missing news main: {source['id']}")
            body = raw[start:end]
        parser = VisibleText()
        parser.feed(body)
        body = " ".join(parser.parts)
    body = re.sub(r"\s+", " ", html.unescape(body)).strip()
    if source["format"] != "gutenberg" and source.get("start"):
        start = body.find(source["start"])
        end = body.find(source["end"], start) if source.get("end") else len(body)
        if start < 0 or end < 0:
            raise ValueError(f"Missing article marker: {source['id']}")
        body = body[start:end].strip()
    if source["format"] == "nih-health":
        for marker in ("References", "Footnotes", "BACK TO TOP"):
            position = body.find(marker)
            if position > 3500:
                body = body[:position].strip()
                break
    if len(body) > MAX_CHARS:
        boundary = body.rfind(' ', 0, MAX_CHARS)
        return body[:boundary].strip()
    return body


def main():
    sources = json.loads(SOURCES.read_text(encoding="utf8"))
    fixtures = []
    for source in sources:
        if source.get("distribution") == "local-only":
            print(f"SKIP copyright-restricted source: {source['id']}")
            continue
        request = Request(source["source"], headers={"User-Agent": "WordwiseCorpusResearch/1.0"})
        try:
            with urlopen(request, timeout=40) as response:
                try:
                    content = response.read()
                except IncompleteRead as error:
                    if source["format"] != "gutenberg":
                        raise
                    content = error.partial
        except (HTTPError, URLError, IncompleteRead, socket.timeout) as error:
            if isinstance(error, HTTPError) and error.code != 403:
                raise
            content = subprocess.run(
                ["node", "-e", "fetch(process.argv[1]).then(r => { if (!r.ok) throw Error(String(r.status)); return r.arrayBuffer() }).then(b => process.stdout.write(Buffer.from(b))).catch(e => { console.error(e); process.exitCode = 1 })", source["source"]],
                check=True, capture_output=True, timeout=45,
            ).stdout
        raw = content.decode("utf8", errors="replace")
        text = extract(source, raw)
        if len(text) < 3500:
            raise ValueError(f"Excerpt too short ({len(text)} characters): {source['id']}")
        fixtures.append({key: source[key] for key in ("id", "genre", "title", "source", "licenseNote")})
        fixtures[-1]["text"] = text
        print(f"{source['id']}: {len(text)} chars")
    OUTPUT.write_text(json.dumps(fixtures, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
