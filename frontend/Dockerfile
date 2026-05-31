# Stage 1: Install dependencies and build the app
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies first (for caching layers)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Pass build args as env variables (essential for client-side environment variables in Next.js)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Stage 2: Create a production-ready container
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy output files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Start Next.js server
CMD ["npm", "run", "start"]
