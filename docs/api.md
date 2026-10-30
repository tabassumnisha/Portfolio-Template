# API reference

JSON over HTTP. Access: **public**, **staff** (admin or editor) or **admin**. Staff/admin routes need the session cookie; every non-GET request also needs the header `X-CSRF-Token` (returned by `POST /api/auth/login` and `GET /api/auth/me`). Errors: `{ "error": "...", "fields": { "name": "..." } }` with status 400/401/403/404/409/413/415/422/429.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | public | Liveness check |
| GET | `/api/public` | public | All website content |
| POST | `/api/contact` | public (rate limited) | Visitor message `{name,email,subject,message}` |
| POST | `/api/auth/login` | public (rate limited) | `{email,password}` -> user + csrf, sets cookie |
| GET | `/api/auth/me` | staff | Current user + csrf |
| POST | `/api/auth/logout` | staff | End session |
| POST | `/api/auth/password` | staff | `{current,next}` |
| GET | `/api/admin/stats` | staff | Dashboard numbers |
| GET/POST | `/api/admin/{categories,projects,services,skills,other-skills}` | staff | List / create |
| GET/PUT/DELETE | `/api/admin/{resource}/:id` | staff | Read / update / delete |
| POST | `/api/admin/projects/:id/feature` | staff | `{featured:true|false}` |
| GET | `/api/admin/messages` | staff | `?unread=1&limit=&offset=` |
| PATCH/DELETE | `/api/admin/messages/:id` | staff | `{is_read}` / delete |
| PUT | `/api/admin/upload` | staff | Raw image body (`Content-Type: image/*`) -> `{path}` |
| GET | `/api/admin/settings` | staff | Site settings |
| PUT | `/api/admin/settings` | admin | Partial update of whitelisted keys |
| GET/POST | `/api/admin/users` | admin | List / create |
| PUT/DELETE | `/api/admin/users/:id` | admin | Update (optional `password`) / delete |
