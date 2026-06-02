# Local-development image for the ReadAloud Worker.
# Runs `wrangler dev` (workerd via Miniflare) — the same runtime Cloudflare uses.
# The worker bundle is self-contained at runtime (the @readaloud/shared import is
# type-only and stripped), so this image needs no monorepo context.
FROM node:22-slim

WORKDIR /app

# Install only the worker's deps (cached unless package.json changes).
COPY package.json ./
RUN npm install --no-audit --no-fund

# Source is bind-mounted by docker-compose for live reload; copied here too so
# the image is runnable on its own.
COPY . .

EXPOSE 8787

# --ip 0.0.0.0 so the port is reachable from the host; non-TTY → non-interactive.
CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0", "--port", "8787"]
