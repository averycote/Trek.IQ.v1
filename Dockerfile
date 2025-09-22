# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p server/data

# Build the client
RUN npm run build

# Expose port
EXPOSE 8081

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081

# Start the application
CMD ["npm", "start"]
