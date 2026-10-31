# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Image upload helpers: type detection by file signature (never by file name) and safe naming."""
import re
import secrets

MAX_UPLOAD_BYTES = 3 * 1024 * 1024
SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
CONTENT_TYPES = {"jpg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}


def detect_extension(data):
    """Return jpg/png/webp/gif from the first bytes of the file, or None for anything else."""
    if data[:3] == b"\xff\xd8\xff":
        return "jpg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    return None


def new_name(extension):
    return "upload-" + secrets.token_hex(8) + "." + extension


def content_type_for(name):
    return CONTENT_TYPES.get(name.rsplit(".", 1)[-1].lower(), "application/octet-stream")
