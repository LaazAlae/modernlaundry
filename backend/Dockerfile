FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create required directories
RUN mkdir -p src/middleware src/models

# Copy source files
COPY src/ ./src/

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "src/server.js"]