FROM node:20-alpine AS dependencies

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]

FROM dependencies AS builder

ARG NEXT_PUBLIC_MAIN_BACKEND_URL=http://localhost:8124/api
ARG NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8130
ENV NEXT_PUBLIC_MAIN_BACKEND_URL=${NEXT_PUBLIC_MAIN_BACKEND_URL}
ENV NEXT_PUBLIC_AI_BACKEND_URL=${NEXT_PUBLIC_AI_BACKEND_URL}
ENV NEXT_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
