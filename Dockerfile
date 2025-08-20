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

# Conditional build based on NODE_ENV
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Always rebuild native modules, but only build admin and prune if production
RUN if [ "$NODE_ENV" = "production" ]; then \
        npm run build && npm prune --production; \
    fi

# Create uploads directory
RUN mkdir -p public/uploads

# Runtime
EXPOSE 1337
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then npm start; else npm run develop; fi"]