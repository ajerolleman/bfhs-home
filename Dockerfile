# Stage 1: Build the React App
# Using Node 22 because React 19 requires a newer version
FROM node:22-alpine as build

# Set the working directory
WORKDIR /app

# Copy package files first to cache dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your code
COPY . .

# Build the website
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Fix for React Router (redirects 404s to index.html so refreshing works)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

# Open port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]