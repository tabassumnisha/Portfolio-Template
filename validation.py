# © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md.
"""Input validation for the Portfolio CMS content (portfolio data and site configuration).

Every function returns None when the value is valid, or a short error message.
Unknown fields are rejected, so the stored content always has a known shape.
"""
import re

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
IMAGE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
IMAGE_PATH_RE = re.compile(r"^assets/images/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
URL_RE = re.compile(r"^https?://[^\s<>\"']{1,300}$")
EMAIL_RE = re.compile(r"^[^@\s<>\"']{1,64}@[^@\s<>\"']{1,200}$")
PHONE_RE = re.compile(r"^\+?[0-9 ()-]{0,24}$")

ICONS = ("i-briefcase", "i-image", "i-heart", "i-code", "i-globe", "i-rocket")
RINGS = ("A", "B")

LIMITS = {"categories": 30, "projects": 200, "services": 60, "skills": 40, "otherSkills": 60, "extraLinks": 12}

OWNER_FIELDS = {"name": 80, "initials": 3, "role": 100, "intro": 400, "about": 800, "tagline": 200,
                "quote": 300, "location": 100, "experience": 40}
SITE_FIELDS = {"title": 120, "description": 300, "footerQuote": 120, "formNote": 300}
CONTACT_FIELDS = ("whatsappNumber", "whatsappGreeting", "email", "website")
SOCIAL_FIELDS = ("facebook", "x", "instagram", "github", "telegram", "reddit")
IMAGE_FIELDS = ("hero", "about")


def _text(value, min_len, max_len):
    return isinstance(value, str) and min_len <= len(value.strip()) and len(value) <= max_len


def _list(data, key):
    value = data.get(key)
    if not isinstance(value, list):
        return None, key + " must be a list."
    if len(value) > LIMITS[key]:
        return None, "Too many items in " + key + "."
    return value, None


def portfolio_error(data):
    """Validate the portfolio object: categories, projects, featured work, services, skills."""
    if not isinstance(data, dict):
        return "Portfolio must be an object."
    allowed = {"categories", "projects", "featuredProjectId", "featuredText", "services", "skills", "otherSkills"}
    if set(data) - allowed:
        return "Unknown portfolio field."

    categories, err = _list(data, "categories")
    if err: return err
    category_ids = set()
    for item in categories:
        if not isinstance(item, dict) or set(item) != {"id", "label"}:
            return "Each category needs an id and a label."
        if not (isinstance(item["id"], str) and ID_RE.match(item["id"])) or not _text(item["label"], 1, 40):
            return "Category ids use lowercase letters, numbers and dashes; labels are 1-40 characters."
        if item["id"] in category_ids:
            return "Duplicate category id: " + item["id"]
        category_ids.add(item["id"])

    projects, err = _list(data, "projects")
    if err: return err
    project_ids = set()
    for item in projects:
        if not isinstance(item, dict) or set(item) != {"id", "title", "subtitle", "category", "image", "alt"}:
            return "Each project needs id, title, subtitle, category, image and alt."
        if not (isinstance(item["id"], str) and ID_RE.match(item["id"])):
            return "Project ids use lowercase letters, numbers and dashes."
        if item["id"] in project_ids:
            return "Duplicate project id: " + item["id"]
        project_ids.add(item["id"])
        if not _text(item["title"], 1, 80) or not _text(item["subtitle"], 0, 80) or not _text(item["alt"], 1, 200):
            return "Project title (1-80), subtitle (0-80) and alt text (1-200) are required."
        if item["category"] not in category_ids:
            return "Project '" + item["id"] + "' uses an unknown category."
        if not (isinstance(item["image"], str) and IMAGE_NAME_RE.match(item["image"])):
            return "Project image must be a plain file name (no folders)."

    featured = data.get("featuredProjectId", "")
    if projects and featured not in project_ids:
        return "The featured project must be one of the projects."
    if not projects and featured:
        return "There are no projects to feature."
    if not _text(data.get("featuredText", ""), 0, 500):
        return "Featured text is too long (500 characters maximum)."

    services, err = _list(data, "services")
    if err: return err
    for item in services:
        if not isinstance(item, dict) or set(item) != {"icon", "title", "text"}:
            return "Each service needs icon, title and text."
        if item["icon"] not in ICONS or not _text(item["title"], 1, 60) or not _text(item["text"], 0, 300):
            return "Service icon, title (1-60) or text (0-300) is invalid."

    skills, err = _list(data, "skills")
    if err: return err
    for item in skills:
        if not isinstance(item, dict) or set(item) != {"name", "short", "level", "ring"}:
            return "Each skill needs name, short, level and ring."
        level = item["level"]
        if not _text(item["name"], 1, 40) or not _text(item["short"], 1, 6) or item["ring"] not in RINGS:
            return "Skill name (1-40), short label (1-6) or ring is invalid."
        if isinstance(level, bool) or not isinstance(level, int) or not 0 <= level <= 100:
            return "Skill level must be a whole number from 0 to 100."

    others, err = _list(data, "otherSkills")
    if err: return err
    if not all(_text(x, 1, 40) for x in others):
        return "Other skills must be text of 1-40 characters."
    return None


def config_error(data):
    """Validate the site configuration: owner, images, contact, social links, site texts."""
    if not isinstance(data, dict):
        return "Configuration must be an object."
    if set(data) - {"owner", "images", "contact", "social", "extraLinks", "site"}:
        return "Unknown configuration section."
    for name in ("owner", "images", "contact", "social", "site"):
        if not isinstance(data.get(name), dict):
            return "Missing section: " + name

    for section, fields in (("owner", OWNER_FIELDS), ("site", SITE_FIELDS)):
        if set(data[section]) - set(fields):
            return "Unknown field in " + section + "."
        for key, limit in fields.items():
            if key in data[section] and not _text(data[section][key], 0, limit):
                return section + "." + key + " is too long (" + str(limit) + " characters maximum)."
    if not _text(data["owner"].get("name", ""), 1, 80):
        return "Owner name is required."

    images = data["images"]
    if set(images) - set(IMAGE_FIELDS) or not all(isinstance(images.get(k), str) and IMAGE_PATH_RE.match(images[k]) for k in IMAGE_FIELDS):
        return "Hero and About images must point to a file in assets/images/."

    contact = data["contact"]
    if set(contact) - set(CONTACT_FIELDS) or not all(isinstance(contact.get(k, ""), str) for k in CONTACT_FIELDS):
        return "Invalid contact section."
    if not PHONE_RE.match(contact.get("whatsappNumber", "")):
        return "WhatsApp number may contain digits, spaces, brackets, dashes and a leading +."
    if not _text(contact.get("whatsappGreeting", ""), 0, 300):
        return "WhatsApp greeting is too long."
    if contact.get("email", "") and not EMAIL_RE.match(contact["email"]):
        return "Contact e-mail is not valid."
    if contact.get("website", "") and not URL_RE.match(contact["website"]):
        return "Website must start with http:// or https://."

    social = data["social"]
    if set(social) - set(SOCIAL_FIELDS):
        return "Unknown social network."
    for key, value in social.items():
        if not isinstance(value, str) or (value and not URL_RE.match(value)):
            return "Social link '" + key + "' must be empty or start with http:// or https://."

    extra, err = _list({"extraLinks": data.get("extraLinks", [])}, "extraLinks")
    if err: return err
    for item in extra:
        if not isinstance(item, dict) or set(item) != {"label", "url"} or not _text(item["label"], 1, 40) \
                or not (isinstance(item["url"], str) and URL_RE.match(item["url"])):
            return "Each extra link needs a label (1-40) and an http(s) address."
    return None


def valid_portfolio(data):
    return portfolio_error(data) is None


def valid_config(data):
    return config_error(data) is None
