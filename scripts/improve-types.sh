#!/bin/bash

# Colors for console output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Create logs directory if it doesn't exist
mkdir -p scripts/logs

echo -e "${YELLOW}Starting type improvement process...${NC}"

# Find all files with 'any' type
echo -e "${YELLOW}Finding files with 'any' type...${NC}"
echo "Files with explicit 'any' type:" > scripts/logs/any-types.log
# Exclude node_modules and any other directories as needed
grep -r --include="*.ts" --include="*.tsx" -n "any" --color=always ./src | grep -v "node_modules" | tee -a scripts/logs/any-types.log

# Count occurrences
ANY_COUNT=$(grep -r --include="*.ts" --include="*.tsx" -n "any" --color=always ./src | grep -v "node_modules" | wc -l)
echo -e "${YELLOW}Found ${ANY_COUNT} occurrences of 'any' type in the codebase.${NC}"

# Check for unused variables
echo -e "${YELLOW}Finding unused variables...${NC}"
echo "Unused variables and imports:" > scripts/logs/unused-vars.log
yarn eslint . --quiet --rule '@typescript-eslint/no-unused-vars: error' | tee -a scripts/logs/unused-vars.log

# Count occurrences
UNUSED_COUNT=$(yarn eslint . --quiet --rule '@typescript-eslint/no-unused-vars: error' | wc -l)
echo -e "${YELLOW}Found ${UNUSED_COUNT} unused variables and imports in the codebase.${NC}"

# Check for missing useEffect dependencies
echo -e "${YELLOW}Finding missing useEffect dependencies...${NC}"
echo "Missing useEffect dependencies:" > scripts/logs/missing-deps.log
yarn eslint . --quiet --rule 'react-hooks/exhaustive-deps: error' | tee -a scripts/logs/missing-deps.log

# Count occurrences
DEPS_COUNT=$(yarn eslint . --quiet --rule 'react-hooks/exhaustive-deps: error' | wc -l)
echo -e "${YELLOW}Found ${DEPS_COUNT} useEffect hooks with missing dependencies.${NC}"

echo -e "${GREEN}Analysis complete!${NC}"
echo -e "${YELLOW}Please review the logs in the scripts/logs directory.${NC}"
echo -e "Next steps:"
echo -e "1. Fix identified 'any' types with proper interfaces or types"
echo -e "2. Remove unused variables and imports"
echo -e "3. Fix useEffect dependencies or add proper eslint-disable comments if intentional"
echo -e "4. Run './scripts/fix-common-issues.sh' to apply automatic fixes"