#!/bin/bash

# Create directory structure
mkdir -p frontend/public/images
mkdir -p frontend/public/icons

# Copy nginx config
cp nginx.conf frontend/

# Make sure all files exist
touch frontend/public/app.js
touch frontend/public/styles.css
touch frontend/public/index.html

# Copy content to files if they don't exist
if [ ! -s frontend/public/index.html ]; then
    cp index.html frontend/public/
fi

if [ ! -s frontend/public/styles.css ]; then
    cp styles.css frontend/public/
fi

if [ ! -s frontend/public/app.js ]; then
    cp app.js frontend/public/
fi

echo "Directory structure created and files copied!"