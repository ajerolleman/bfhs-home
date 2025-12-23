# Use Node 20 (Standard and stable)
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your app code
COPY . .

# Build the app (Creates the 'dist' folder)
RUN npm run build

# Install a simple web server
RUN npm install -g serve

# Tell the server to listen on Port 8080 (Crucial for Cloud Run)
CMD ["serve", "-s", "dist", "-l", "8080"]