# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Authentication: password hashing, signed-cookie sessions and sign-in throttling. No database access here."""
import base64
import hashlib
import hmac
import json
import secrets
import time

from . import settings

SESSIONS = {}          # in-memory sessions (normal server); serverless hosting uses the signed cookie instead
LOGIN_FAILURES = {}    # client address -> timestamps of recent failed sign-ins
COOKIE_NAME = "portfolio_session"


def password_hash(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    return salt.hex() + "$" + hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000).hex()


def password_ok(password, stored):
    try:
        salt_hex, digest = stored.split("$", 1)
        return hmac.compare_digest(password_hash(password, bytes.fromhex(salt_hex)).split("$", 1)[1], digest)
    except Exception:
        return False


def _sign(sid):
    return hmac.new(settings.SESSION_SECRET.encode(), sid.encode(), hashlib.sha256).hexdigest()


def cookie_value(cookie_header):
    """The raw value of the session cookie in a Cookie header, or ''."""
    for part in (cookie_header or "").split(";"):
        k, _, v = part.strip().partition("=")
        if k == COOKIE_NAME: return v
    return ""


def start_session(user_id):
    """Create a session for a signed-in user and return the Set-Cookie header value."""
    if settings.STATELESS_SESSIONS:
        claims = json.dumps({"u": user_id, "e": int(time.time() + settings.SESSION_TTL)}, separators=(",", ":")).encode()
        sid = "v1_" + base64.urlsafe_b64encode(claims).decode().rstrip("=")
    else:
        sid = secrets.token_urlsafe(32)
        SESSIONS[sid] = {"user_id": user_id, "expires": time.time() + settings.SESSION_TTL}
    cookie = "%s=%s.%s; Path=/; HttpOnly; SameSite=Strict; Max-Age=%d" % (COOKIE_NAME, sid, _sign(sid), settings.SESSION_TTL)
    if settings.COOKIE_SECURE: cookie += "; Secure"
    return cookie


def end_session(cookie_header):
    """Forget the in-memory session behind a Cookie header and return the cookie-clearing Set-Cookie value."""
    SESSIONS.pop(cookie_value(cookie_header).split(".", 1)[0], None)
    return COOKIE_NAME + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"


def read_session(cookie_header):
    """Validate the signed session cookie. Returns {"user_id", "expires"} or None."""
    value = cookie_value(cookie_header)
    if not value or not settings.session_secret_ready(): return None
    sid, sep, sig = value.partition(".")
    if not sep or not hmac.compare_digest(sig, _sign(sid)): return None
    if settings.STATELESS_SESSIONS and sid.startswith("v1_"):
        try:
            claims = json.loads(base64.urlsafe_b64decode(sid[3:] + "=" * (-len(sid[3:]) % 4)))
            session = {"user_id": int(claims["u"]), "expires": float(claims["e"])}
        except (ValueError, KeyError, TypeError):
            return None
        return session if session["expires"] >= time.time() else None
    session = SESSIONS.get(sid)
    if not session or session["expires"] < time.time():
        SESSIONS.pop(sid, None); return None
    session["expires"] = time.time() + settings.SESSION_TTL
    return session


def recent_failures(address):
    now = time.time()
    attempts = [t for t in LOGIN_FAILURES.get(address, []) if now - t < settings.LOGIN_WINDOW_SECONDS]
    LOGIN_FAILURES[address] = attempts
    return attempts


def record_failure(address):
    LOGIN_FAILURES.setdefault(address, []).append(time.time())


def clear_failures(address):
    LOGIN_FAILURES.pop(address, None)
