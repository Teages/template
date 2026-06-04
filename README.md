## Use this template

```bash
npx giget@latest gh:teages/template#fullstack package-name
```

# Fullstack App

## Production Docker

Build the production images and start Postgres, backend, and frontend:

```bash
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
docker compose -f docker-compose.prod.yml up --build -d
```

Run migrations as an explicit one-off step:

```bash
docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate
```

Set `APP_ORIGIN` to the public frontend origin in real deployments, for example `https://app.example.com`. The frontend container proxies `/graphql` and `/api/auth/**` to the backend container over the Docker network.
