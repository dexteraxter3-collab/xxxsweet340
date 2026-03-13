# Backend for frontend

This folder contains a minimal Flask backend to support the frontend files in the repository root. It provides:

- `POST /api/upload` — file upload (multipart `file` field)
- `GET /api/uploads` — list uploaded files
- `GET /uploads/<filename>` — download served file
- `POST /api/contact` — contact form endpoint (stores in MongoDB; optional SMTP notify)
- `POST /api/admin/login` — admin login (returns JWT)
- `DELETE /api/admin/uploads/<id>` — delete an upload (admin only)

Quick start

1. Create a Python virtualenv and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Copy `./.env.example` to `.env` and set `MONGO_URI`, `JWT_SECRET`, and `ADMIN_PASSWORD`.

3. Run the app:

```bash
python app.py
```

The server serves the frontend files from the repository root, so open `http://localhost:5000/`.

Notes

- The project expects a running MongoDB instance (set `MONGO_URI`). If `MONGO_URI` is not provided, uploads are saved to the `backend/uploads` folder but metadata will not be persisted.
- For email notifications from the contact form set SMTP variables in `.env`.
- This is a minimal example — for production use add validation, rate-limiting, stronger auth, and HTTPS.
