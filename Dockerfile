# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files first for better caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies (ignoring scripts for better-sqlite3)
RUN npm install --ignore-scripts
RUN cd server && npm install --ignore-scripts
RUN cd client && npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p server/data

# Build the client with proper error handling (v1.0.1 - driving mode fixes)
RUN cd client && npm run build

# Copy build files to public directory
RUN npm run copy:build

# Verify build was successful
RUN ls -la public/ && ls -la client/build/

# Expose port
EXPOSE 8081

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081

# Start the application
CMD ["npm", "start"]
