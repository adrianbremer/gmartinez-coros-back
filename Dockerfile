FROM node:20

# Install build requirements for native modules
RUN apt-get update && apt-get install -y \
    g++ \
    make \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild native modules regardless of environment
RUN npm ci && npm rebuild sharp @swc/core || true

# Copy source
COPY . .

# Debug: Check src folder before build
RUN echo "=== BEFORE BUILD ===" && ls -la && echo "=== SRC FOLDER CONTENTS ===" && ls -la src/ || echo "src folder missing before build"

# Conditional build based on NODE_ENV
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Debug: Show NODE_ENV value
RUN echo "=== NODE_ENV is: $NODE_ENV ==="

# Always rebuild native modules, but only build admin and prune if production
RUN if [ "$NODE_ENV" = "production" ]; then \
        echo "=== RUNNING PRODUCTION BUILD ==="; \
        npm run build && npm prune --production; \
    else \
        echo "=== SKIPPING BUILD (NODE_ENV=$NODE_ENV) ==="; \
    fi

# Debug: Check src folder after build
RUN echo "=== AFTER BUILD ===" && ls -la && echo "=== SRC FOLDER CONTENTS ===" && ls -la src/ || echo "src folder missing after build"

# Create uploads directory
RUN mkdir -p public/uploads

# Runtime
EXPOSE 1337
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm start; else npm run develop; fi"]