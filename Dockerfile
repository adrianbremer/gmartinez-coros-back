# Robust Dockerfile for Strapi (Debian-based, handles native bindings like sharp and swc)
FROM node:20

# Install build requirements for native modules (node-gyp)
RUN apt-get update && apt-get install -y \
		g++ \
		make \
		python3 \
	&& rm -rf /var/lib/apt/lists/*

# App dir
WORKDIR /opt/app

# Copy package manifests (use lockfile for exact versions)
COPY package*.json ./

# Install exact dependencies from lockfile and rebuild native modules for this OS/arch
ENV npm_config_loglevel=info
RUN npm ci && npm rebuild sharp @swc/core || true

# Copy source
COPY . .

# Build admin and prune devDeps in the same layer to keep image smaller
ENV NODE_ENV=production
RUN npm run build && npm prune --production && mkdir -p public/uploads

# Runtime
EXPOSE 1337
CMD ["npm", "start"]
