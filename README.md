# GovTech Node.js API Assessment

Node.js + MySQL implementation of the teacher/student administrative API.

## User stories covered

This API implements all 4 stories from the assessment brief:

1. **Register students to a teacher**  
   `POST /api/register`
2. **Retrieve common students across teachers**  
   `GET /api/commonstudents?teacher=<email>[&teacher=<email>]`
3. **Suspend a student**  
   `POST /api/suspend`
4. **Retrieve recipients for notifications**  
   `POST /api/retrievefornotifications`

## Tech stack

- Node.js (Express)
- MySQL 8 (Docker Compose)
- Jest + Supertest (testing setup)

## Prerequisites

- Docker Desktop (or Docker Engine + Compose)
- Node.js 20+
- pnpm (or npm; commands below use pnpm)

## Environment variables

I have committed them for the sake of the project:

```env
DB_HOST=127.0.0.1
DB_USER=user
DB_PORT=3306
DB_PASSWORD=p@ssw0rd
DB_NAME=govtech_assessment
PORT=3000
```

`govtech_assessment` is used because MySQL database names are safest without spaces in automation scripts.

## Run locally

1. Start MySQL:

```bash
docker compose up -d
```

2. Install dependencies:

```bash
pnpm i
```

3. Start API server:

```bash
node server.js
```

Server runs on `http://localhost:3000`.

## Run tests

```bash
pnpm test
```

### Current test coverage (highlight)

- **9 tests are currently passing** in `test/apiController.test.js`.
- Includes happy-path coverage for all 4 user stories.
- Includes key negative paths:
  - missing teacher on register (`400`)
  - teacher not found on register (`404`)
  - missing teacher query for commonstudents (`400`)
  - student not found on suspend (`404`)
  - missing notification text (`400`)

## API endpoints

- `POST /api/register`
- `GET /api/commonstudents?teacher=<email>[&teacher=<email>]`
- `POST /api/suspend`
- `POST /api/retrievefornotifications`

## Docker compose notes

Current compose file uses:

- MySQL image: `mysql:8.3.0`
- DB name: `govtech_assessment`
- App DB user: `user`
- App DB password: `p@ssw0rd`
- Init SQL folder: `./db-setup`
