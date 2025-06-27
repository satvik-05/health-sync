# Use official Node.js LTS image as base
FROM node:18-alpine

# Install SQLite3 and other system dependencies
RUN apk --no-cache add sqlite python3 make g++

# Install Sequelize CLI globally
RUN npm install -g sequelize-cli

# Create app directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (production only for smaller image size)
RUN npm install --only=production

# Copy app source
COPY --chown=node:node . .

# Create data directory and set permissions
RUN mkdir -p /usr/src/app/data && \
    chown -R node:node /usr/src/app && \
    chmod -R 755 /usr/src/app/data

# Ensure node_modules is owned by the node user
RUN chown -R node:node /usr/src/app/node_modules

# Copy the entrypoint script
COPY --chown=node:node docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER node

# Set the entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose the app port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Command to run the application
CMD ["npm", "start"]
