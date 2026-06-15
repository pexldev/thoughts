# Setup Guide — YouTube Analytics Report Generator

## Step 1 — Install dependencies

Already done. A venv lives at `analytics/.venv/` with all packages installed.

If you ever need to reinstall:
```bash
cd "/Users/prateekmuralidharan/My Projects/thoughts/analytics"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

---

## Step 2 — Google Cloud Console setup

1. Go to console.cloud.google.com
2. Create a new project — name it "Side Effects Analytics" or anything
3. Enable these two APIs:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth 2.0 Client ID**
6. Application type: **Desktop app**
7. Download the JSON file
8. Rename it to `credentials.json`
9. Place it in this folder (`/analytics/credentials.json`)

---

## Step 3 — OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**
2. User type: **External**
3. Fill in app name: "Side Effects Analytics"
4. Add your Gmail as a test user
5. Save

---

## Step 4 — Run the script

```bash
cd "/Users/prateekmuralidharan/My Projects/thoughts/analytics"
.venv/bin/python report_generator.py
```

First run will open a browser asking you to authenticate with your Google account. Allow it. After that it stores a token and runs silently every time.

---

## Step 5 — Analyse the report

Open Claude Code and say:

> "analyse my latest analytics report"

Claude will read the generated markdown file and give you a full breakdown.

---

## Files in this folder

| File | Purpose |
|---|---|
| `report_generator.py` | Main script |
| `requirements.txt` | Python dependencies |
| `credentials.json` | Your Google OAuth credentials (you add this) |
| `token.json` | Auto-generated after first auth (do not delete) |
| `YYYY-MM-DD_youtube_report.md` | Generated reports |

---

## .gitignore reminder

Add these to your .gitignore — never commit credentials:

```
credentials.json
token.json
```
