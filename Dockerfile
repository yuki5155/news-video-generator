FROM node:22-bookworm

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /workspace

CMD ["sleep", "infinity"]
