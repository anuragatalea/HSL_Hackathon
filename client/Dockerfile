FROM node:20-slim

WORKDIR /app

# Copy dependency files first for layer caching
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy frontend source code
COPY . .

EXPOSE 5173

# Run Vite dev server with external host binding
CMD ["npm", "run", "dev"]
