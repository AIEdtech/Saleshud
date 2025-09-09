# SalesHud Project Guidelines

## Project Overview
SalesHud is an AI-powered sales intelligence Electron application built with React, TypeScript, and Tailwind CSS.

## Tech Stack
- **Electron** (v28.2.0) - Desktop application framework
- **React** (v18.2.0) - Frontend framework
- **TypeScript** (v5.3.3) - Type safety
- **Tailwind CSS** (v3.4.1) - Styling
- **Webpack** (v5.90.3) - Module bundler
- **Supabase** - Backend services
- **Framer Motion** - Animations

## Project Structure
```
saleshud-app/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React application
│   └── preload/        # Preload scripts
├── assets/             # Application assets
├── build/              # Build configuration
├── scripts/            # Build and development scripts
└── supabase/           # Supabase configuration
```

## Important Commands

### Development
```bash
npm run dev              # Start development server
npm run type-check       # Type check TypeScript files
npm run lint             # Lint code
npm run lint:fix         # Lint and fix code
```

### Building
```bash
npm run build            # Build for production
npm run dist             # Build and package application
npm run dist:mac         # Build for macOS
npm run dist:win         # Build for Windows
npm run dist:linux       # Build for Linux
```

### Testing
```bash
npm run test             # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Run tests with coverage
```

### Maintenance
```bash
npm run clean            # Clean dist and release folders
npm run clean:all        # Clean all build artifacts and cache
```

## Code Quality Guidelines

### Before Committing
Always run these commands before committing changes:
```bash
npm run type-check       # Ensure no TypeScript errors
npm run lint             # Ensure code follows standards
npm run test:run         # Ensure tests pass
```

### Code Style
- Use TypeScript for type safety
- Follow existing component patterns
- Use Tailwind CSS for styling
- Keep components modular and reusable
- Use meaningful variable and function names

### File Organization
- Main process code goes in `src/main/`
- React components go in `src/renderer/`
- Shared types go in `src/types/`
- Utilities go in `src/utils/`

## Environment Variables
The project uses `.env` files for configuration. Copy `.env.example` to `.env` and update with your values:
```bash
cp .env.example .env
```

## Security Considerations
- Never commit `.env` files
- Never expose sensitive API keys
- Always validate user input
- Use context isolation in Electron
- Keep dependencies up to date

## Build Configuration
- Electron Builder config: `electron-builder.config.js`
- Webpack configs: `webpack.*.config.js`
- TypeScript config: `tsconfig.json`
- Tailwind config: `tailwind.config.js`

## Asset Generation
```bash
npm run generate:assets  # Generate application icons
npm run validate:assets  # Validate asset files
```

## Troubleshooting

### Common Issues
1. **Build fails**: Run `npm run clean:all` then `npm install`
2. **Type errors**: Run `npm run type-check` to identify issues
3. **Lint errors**: Run `npm run lint:fix` to auto-fix
4. **Test failures**: Check test output with `npm run test:ui`

### Development Tips
- Use `npm run dev` for hot-reload development
- Check console for runtime errors
- Use Chrome DevTools for debugging (available in dev mode)
- Monitor TypeScript compilation with `npm run type-check:watch`

## CI/CD Notes
- Ensure all tests pass before merging
- Build artifacts are generated in `dist/` folder
- Release packages are created in `release/` folder
- Use semantic versioning for releases

## Performance Optimization
- Lazy load heavy components
- Use React.memo for expensive renders
- Optimize images and assets
- Monitor bundle size with `npm run build:analyze`

## Notes for AI Assistants
- Always check existing patterns before implementing new features
- Run lint and type-check after making changes
- Test thoroughly in development mode before building
- Keep code consistent with existing architecture
- Update this file when adding new important commands or patterns