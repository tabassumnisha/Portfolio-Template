# Entity relationship diagram

Single-owner model: one `profile` row is the owner of the portfolio. `photos` and `contacts` belong to it through `owner_id`.
Everything else is portfolio content. The running website reads the JSON in `app_content`; the relational tables mirror the default content and are the clean starting point if you move to Firebase, Supabase or PostgreSQL.

```mermaid
erDiagram
    profile ||--o{ photos : "owner_id"
    profile ||--o{ contacts : "owner_id"
    categories ||--o{ projects : "category_id"
    admin_users }o--o{ app_content : "edits (admin panel)"

    profile {
        integer id PK
        varchar slug "unique index"
        varchar full_name
        varchar initials
        varchar role_title
        varchar intro
        varchar about
        varchar location
        varchar experience
    }
    photos {
        integer id PK
        integer owner_id FK "index"
        varchar slot "hero or about"
        varchar file_name
        varchar alt_text
    }
    contacts {
        integer id PK
        integer owner_id FK "index"
        varchar kind "whatsapp, email, website, social"
        varchar value
        integer sort_order
    }
    categories {
        varchar id PK
        varchar label
        integer sort_order "index"
    }
    projects {
        varchar id PK "the project slug"
        varchar title
        varchar subtitle
        varchar category_id FK "index"
        varchar image_file
        varchar alt_text
        integer sort_order "index"
    }
    services {
        integer id PK
        varchar icon
        varchar title
        varchar body
        integer sort_order "index"
    }
    skills {
        varchar name PK
        varchar short_label
        integer level "0 to 100"
        char ring "A or B"
        integer sort_order "index"
    }
    other_skills {
        varchar name PK
        integer sort_order
    }
    site_settings {
        varchar setting_key PK
        varchar setting_value
    }
    admin_users {
        integer id PK
        text email "unique"
        text password_hash "salted PBKDF2, never a plain password"
        text role "admin"
        text created_at
    }
    app_content {
        text content_key PK "portfolio or config"
        text json_value "live website content"
        text updated_at
    }
```

## Tables
| Table | Purpose | Written by |
|---|---|---|
| `profile` | The portfolio owner: name, role, texts, location | seed, reference |
| `photos` | Hero and about photos of the owner (`owner_id` to `profile`) | seed, reference |
| `contacts` | WhatsApp, e-mail, website and social links of the owner (`owner_id` to `profile`) | seed, reference |
| `categories` | Gallery filter buttons | seed, reference |
| `projects` | Gallery items; `id` is the project's slug; `category_id` to `categories` (`ON DELETE RESTRICT`) | seed, reference |
| `services` | The services section | seed, reference |
| `skills`, `other_skills` | Skill rings and extra skill tags | seed, reference |
| `site_settings` | Featured project id and text | seed, reference |
| `admin_users` | The administrator account (one owner) | first start, password change |
| `app_content` | **Live content as JSON** (`portfolio`, `config`) | admin panel (`PUT /api/admin/content/...`) |

There is no `sessions` table: a session is an HMAC-signed `HttpOnly` cookie (see `database/schema.sql`).
