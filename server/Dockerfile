FROM node:20-slim

# Install OpenSSL for Prisma and curl for healthchecks
RUN apt-get update -y && apt-get install -y openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package definitions and prisma schema first for efficient Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies required for tsx and prisma)
RUN npm install

# Copy application source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

EXPOSE 4000

# Push schema, seed initial records, and start tsx watch server
CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npx prisma db seed && npm run dev"]
