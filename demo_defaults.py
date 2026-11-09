# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Built-in sign-in for a PUBLIC DEMO only.

Used by server.py only when DEMO_MODE=true and the matching environment variable is not set (or is still CHANGE_ME).
These values are public on purpose so marketplace reviewers can open /admin/ with one setting.
Never use DEMO_MODE on a real site: set your own ADMIN_EMAIL, ADMIN_PASSWORD and SESSION_SECRET instead.
"""
EMAIL = "demo@example.com"
PASSWORD = "Demo-Admin-2026!"
SESSION_SECRET = "public-demo-session-key-do-not-use-on-a-real-site-0001"
