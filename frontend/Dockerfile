# Use Node.js 18 as the base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
# Note: We rely on the mount for development, but having them in the image
# ensures the container can start even if the mount is empty or slow.
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Default command for development
CMD ["npm", "run", "dev"]