# BEATS-DAW Backend

## Setup

1. **Install dependencies:**
```bash
cd server
npm install
```

2. **Set up environment:**
```bash
cp .env.example .env
# Edit .env with your database and storage credentials
```

3. **Set up database:**
```bash
# Ensure PostgreSQL is running, then:
npx prisma generate
npx prisma db push
```

4. **Install Python dependencies (for stem splitting):**
```bash
pip install spleeter
```

## Running

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `R2_ACCESS_KEY` | Cloudflare R2 access key |
| `R2_SECRET_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `R2_ENDPOINT` | R2 endpoint URL |
| `R2_PUBLIC_URL` | Public URL for files |
| `PORT` | Server port (default: 3001) |

## API Endpoints

### Health
- `GET /health` - Health check

### Projects
- `POST /api/projects` - Create project
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Files
- `POST /api/files/presign-upload` - Get presigned upload URL
- `GET /api/files/:id` - Get file info
- `DELETE /api/files/:id` - Delete file

### Export
- `POST /api/export/render` - Render project to audio

### Stems
- `POST /api/stems/split` - Split audio into stems
