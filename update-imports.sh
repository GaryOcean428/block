#!/bin/bash

# Make the script exit on error
set -e

# Files that need updating
files=(
  "src/pages/MarketAnalysis.tsx"
  "src/pages/Dashboard.tsx"
  "src/pages/Account.tsx"
  "src/components/Sidebar.tsx"
  "src/components/Integration.tsx"
  "src/components/MockModeNotice.tsx"
  "src/components/strategy/NewStrategyForm.tsx"
  "src/components/dashboard/AccountSummary.tsx"
  "src/pages/Strategies.tsx"
  "src/components/dashboard/QuickTrade.tsx"
  "src/components/strategy/StrategyDetails.tsx"
)

# For each file, replace the import statement
for file in "${files[@]}"; do
  echo "Updating $file"
  # Use sed to replace the import statement
  sed -i 's|import { useTradingContext } from \(.*\)context/TradingContext|import { useTradingContext } from \1hooks/useTradingContext|g' "$file"
done

echo "All imports updated successfully!"
