#!/bin/bash
set -e

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /Users/manojmbhat/Coding/News

# Activate Python venv
source .venv/bin/activate

echo "$(date) - Starting UnlistedPulse pipeline"

# 1. Run scrapers
echo "Running scrapers..."
python -m scrapers.main

# 2. Generate API JSON files
echo "Generating API files..."
python -m scrapers.generate_api

# 3. Copy data to Astro src
echo "Copying data to Astro..."
cp data/*.json site/src/data/

# 4. Build Astro
echo "Building site..."
cd site && npm run build

# 5. Deploy to Cloudflare Pages (uncomment when ready)
# echo "Deploying to Cloudflare Pages..."
# npx wrangler pages deploy dist/ --project-name unlisted-pulse

echo "$(date) - Pipeline complete"
