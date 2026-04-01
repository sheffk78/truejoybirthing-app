#!/bin/bash
set -e

# True Joy Birthing - iOS Build Script
# Usage: ./build-ios.sh

FRONTEND_DIR="$(cd "$(dirname "$0")/frontend" && pwd)"
YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}🍎 True Joy Birthing - iOS Build${NC}"
echo "=================================="

# Step 1: Pull latest from GitHub
echo ""
echo -e "${YELLOW}📥 Pulling latest code...${NC}"
cd "$(dirname "$0")"
git fetch origin
git merge origin/main --no-edit || {
    echo -e "${RED}⚠️  Merge conflict detected. Resolve manually, then re-run this script.${NC}"
    exit 1
}
echo -e "${GREEN}✅ Code is up to date${NC}"

# Step 2: Install JS dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$FRONTEND_DIR"
npm install --legacy-peer-deps
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 3: Clean old iOS build
echo ""
echo -e "${YELLOW}🧹 Cleaning old iOS build...${NC}"
rm -rf "$FRONTEND_DIR/ios"
echo -e "${GREEN}✅ Cleaned${NC}"

# Step 4: Expo prebuild
echo ""
echo -e "${YELLOW}🔧 Running Expo prebuild...${NC}"
npx expo prebuild --platform ios
echo -e "${GREEN}✅ Prebuild complete${NC}"

# Step 5: Pod install
echo ""
echo -e "${YELLOW}🔗 Installing CocoaPods...${NC}"
cd "$FRONTEND_DIR/ios"
rm -f Podfile.lock
pod install --repo-update
echo -e "${GREEN}✅ Pods installed${NC}"

# Step 6: Open Xcode
echo ""
echo -e "${GREEN}🚀 Opening Xcode...${NC}"
echo -e "In Xcode: select ${YELLOW}Any iOS Device${NC} → ${YELLOW}Product → Archive${NC} → ${YELLOW}Distribute App${NC}"
echo ""
open TrueJoyBirthing.xcworkspace
