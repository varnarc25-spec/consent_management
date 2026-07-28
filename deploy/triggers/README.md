# Cloud Build trigger YAML (reference)

Use **Repository config** instead of these files when possible:

- `cloudbuild.api.yaml`
- `cloudbuild.admin.yaml`
- `cloudbuild.web.yaml`

If your trigger uses **Inline** config, copy the matching file below into the trigger editor.

**Critical rule:** the last argument to `docker build` must be `.` (repo root), **not** `docker`.

Wrong (9 KB context, fails):

```yaml
      - docker
      - '-f'
      - docker/Dockerfile.web
```

Correct:

```yaml
      - '-f'
      - docker/Dockerfile.web
      - .
```

Also set **Source directory** on the trigger to empty / `/` — not `docker`.
