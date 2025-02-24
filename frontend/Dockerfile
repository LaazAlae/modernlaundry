FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /usr/share/nginx/html/icons \
    && mkdir -p /usr/share/nginx/html/images

# Copy static files
COPY public /usr/share/nginx/html/

# Create default icon for fallback
RUN echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8=" | base64 -d > /usr/share/nginx/html/images/default-icon.png

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]