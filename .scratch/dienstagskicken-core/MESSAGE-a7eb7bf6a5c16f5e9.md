# Message for agent a7eb7bf6a5c16f5e9

**STOP — read before doing any DB operations.**

Do not modify the local PostgreSQL. The Docker database is now running.

Your DATABASE_URL is:

```
postgresql://postgres:postgres@localhost:5432/dienstagskicken
```

(from `.env.local`)

Use that URL for all Prisma operations.

If you already ran `prisma migrate` or any DB operations against a local postgres instance, undo those and re-run them pointing at the Docker DB instead.

If the Docker DB is not yet up, start it first:

```bash
docker-compose up -d db
```

Then re-run any pending migrations:

```bash
rtk prisma migrate deploy
```
