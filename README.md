# Poloniex Trading Platform

A comprehensive cryptocurrency trading platform with support for automated trading strategies, backtesting, and exchange integration via browser extension.

## Features

- Automated trading with customizable strategies
- Real-time market data visualization
- Strategy backtesting and performance analysis
- Browser extension for Poloniex and TradingView integration
- Portfolio tracking and trade history
- Authentication and secure API key management

## Local Development & Testing

1. Install dependencies:

```bash
yarn
```

2. Start the development server:

```bash
yarn dev
```

3. Load the Chrome extension:

- Open Chrome and go to `chrome://extensions`
- Enable "Developer mode" in the top right
- Click "Load unpacked" and select the `extension` folder from this project

4. Testing modes:

- **Mock Mode**: By default, all API calls use mock data in development
- **Live Testing**: To test with real API:
  1. Add your Poloniex API credentials in Settings
  2. Enable "Live Trading" mode
  3. The extension will connect to your Poloniex account

5. Extension Features:

- TradingView integration: Visit TradingView to test chart data extraction
- Poloniex integration: Visit Poloniex to test trading features
- Account sync: Extension saves login state between sessions

## Development Workflow

### Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn lint` - Lint code
- `yarn lint:fix` - Fix linting issues automatically
- `yarn format` - Format code with Prettier
- `yarn check-types` - Check TypeScript types
- `yarn test` - Run all tests
- `yarn test:watch` - Run tests in watch mode
- `yarn server` - Start backend server

### Helper Scripts

- `./scripts/fix-common-issues.sh` - Automatically fix common issues
- `./scripts/improve-types.sh` - Analyze codebase for typing issues

## Production Deployment

1. Build the application:

```bash
yarn build
```

2. Package the extension:

- Update `manifest.json` with production URLs
- Zip the extension folder for Chrome Web Store submission
- Use the built-in extension packager from the app:
  ```bash
  yarn build
  yarn server
  ```
  Then navigate to `/extension` in the app and click "Download Extension"

3. Deploy the web application:

```bash
yarn build
yarn deploy  # Requires configuration in package.json
```

## Project Structure

- `/src` - Main application code
  - `/components` - UI components
  - `/context` - React context providers
  - `/hooks` - Custom React hooks
  - `/pages` - Application pages
  - `/services` - API and service integrations
  - `/types` - TypeScript type definitions
  - `/utils` - Utility functions
- `/extension` - Browser extension code
- `/public` - Static assets
- `/server` - Backend server code
- `/supabase` - Supabase configuration and migrations

## Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_POLONIEX_API_KEY=your_api_key         # For testing only
VITE_POLONIEX_API_SECRET=your_api_secret   # For testing only
```

## Security Notes

- API keys are stored securely in Chrome's extension storage
- All trading actions require explicit user confirmation
- Mock mode prevents accidental real trades during testing
- All sensitive operations require authentication
- User API keys are encrypted before storage

## Contributing

1. Check the issue tracker for open issues
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
