"""Dependency-free PDF text extractor for the PS4 games list.

The provided PDF uses the standard PDFium output layout:
  streams with /Filter[/ASCII85Decode/FlateDecode] and WinAnsi Helvetica fonts.
So we can decode ASCII85 -> zlib and then parse the text-showing operators.

Usage:
  python scripts/extract-pdf-list.py "<input.pdf>" "<output.txt>"
"""

import base64
import re
import sys
import zlib


def decode_streams(raw: bytes) -> list[bytes]:
    out = []
    for m in re.finditer(rb"stream\r?\n", raw):
        start = m.end()
        end = raw.find(b"endstream", start)
        if end == -1:
            continue
        chunk = raw[start:end]
        # PDFium writes plain (non-Adobe-framed) ASCII85 that still ends with "~>".
        cut = chunk.find(b"~>")
        if cut != -1:
            chunk = chunk[:cut]
        try:
            data = base64.a85decode(chunk, adobe=False, ignorechars=b" \t\r\n\v\f")
        except Exception:
            continue
        try:
            out.append(zlib.decompress(data))
        except Exception:
            try:
                out.append(zlib.decompressobj().decompress(data))
            except Exception:
                continue
    return out


TOKEN_RE = re.compile(rb"\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]*>|[-+]?[\d.]+|Tj|TJ|Td|TD|T\*|BT|ET")


def unescape(pdf_string: bytes) -> str:
    body = pdf_string[1:-1]
    res = bytearray()
    i = 0
    while i < len(body):
        c = body[i]
        if c == 0x5C and i + 1 < len(body):
            nxt = body[i + 1]
            mapping = {0x6E: 10, 0x72: 13, 0x74: 9, 0x62: 8, 0x66: 12}
            if nxt in mapping:
                res.append(mapping[nxt])
                i += 2
                continue
            if 0x30 <= nxt <= 0x37:
                oct_digits = bytes(body[i + 1:i + 4])
                oct_digits = oct_digits[: len(re.match(rb"[0-7]{0,3}", oct_digits).group(0))]
                res.append(int(oct_digits, 8) & 0xFF)
                i += 1 + len(oct_digits)
                continue
            res.append(nxt)
            i += 2
            continue
        res.append(c)
        i += 1
    return res.decode("cp1252", errors="replace")


def content_to_lines(content: bytes) -> list[str]:
    """Rebuild text lines using BT/ET + Td/TD/T* movement operators."""
    lines: list[str] = []
    current: list[str] = []
    prev_kind = None

    for m in TOKEN_RE.finditer(content):
        tok = m.group(0)
        if tok == b"BT":
            current = []
            prev_kind = None
        elif tok in (b"ET",):
            if current:
                lines.append("".join(current).strip())
            current = []
        elif tok in (b"Td", b"TD", b"T*"):
            if current:
                lines.append("".join(current).strip())
                current = []
            prev_kind = tok
        elif tok.startswith(b"("):
            current.append(unescape(tok))
        elif tok.startswith(b"<"):
            hex_body = re.sub(rb"\s+", b"", tok[1:-1])
            if len(hex_body) % 2:
                hex_body += b"0"
            try:
                current.append(bytes.fromhex(hex_body.decode("ascii")).decode("cp1252", "replace"))
            except Exception:
                pass
    if current:
        lines.append("".join(current).strip())
    return lines


def main() -> int:
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else None
    raw = open(src, "rb").read()

    all_lines: list[str] = []
    for idx, stream in enumerate(decode_streams(raw), start=1):
        if b"Tj" not in stream and b"TJ" not in stream:
            continue
        lines = [ln for ln in content_to_lines(stream) if ln]
        if lines:
            all_lines.append(f"===== page {idx} =====")
            all_lines.extend(lines)

    text = "\n".join(all_lines)
    if dst:
        open(dst, "w", encoding="utf-8").write(text)
        print(f"wrote {len(all_lines)} lines -> {dst}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
