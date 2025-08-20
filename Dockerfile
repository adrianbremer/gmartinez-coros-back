# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /opt/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create uploads directory and build the application
RUN mkdir -p public/uploads && npm run build

# Expose port
EXPOSE 1337

# Start the application
CMD ["npm", "start"]
