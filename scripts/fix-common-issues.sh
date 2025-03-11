#!/bin/bash

# Create directory if it doesn't exist
mkdir -p scripts/logs

# Colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting automated linting fixes...${NC}"

# Run Prettier first
echo -e "${YELLOW}Running Prettier to format all files...${NC}"
yarn format > scripts/logs/prettier.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Prettier completed successfully!${NC}"
else
  echo -e "${RED}Prettier encountered issues. Check scripts/logs/prettier.log for details.${NC}"
fi

# Run ESLint automatic fixes
echo -e "${YELLOW}Running ESLint with automatic fixes...${NC}"
yarn lint:fix > scripts/logs/eslint.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}ESLint fixes completed successfully!${NC}"
else
  echo -e "${RED}ESLint encountered issues. Check scripts/logs/eslint.log for details.${NC}"
fi

# Remove unused variables
echo -e "${YELLOW}Removing unused imports and variables...${NC}"
yarn fix:unused-vars > scripts/logs/unused-vars.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Unused imports and variables cleaned up!${NC}"
else
  echo -e "${RED}Issues removing unused variables. Check scripts/logs/unused-vars.log for details.${NC}"
fi

# Fix useEffect dependencies
echo -e "${YELLOW}Fixing useEffect dependencies...${NC}"
yarn fix:deps > scripts/logs/deps.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}useEffect dependencies fixed!${NC}"
else
  echo -e "${RED}Issues fixing dependencies. Check scripts/logs/deps.log for details.${NC}"
fi

# Type checking
echo -e "${YELLOW}Running TypeScript type check...${NC}"
yarn check-types > scripts/logs/types.log 2>&1
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Type checking passed!${NC}"
else
  echo -e "${RED}Type checking failed. Check scripts/logs/types.log for details.${NC}"
fi

echo -e "${GREEN}All automated fixes completed!${NC}"
echo -e "${YELLOW}Please review the changes before committing.${NC}"