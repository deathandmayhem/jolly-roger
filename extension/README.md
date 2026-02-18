# Jolly Roger Browser Extension

## Project Structure

- src: TypeScript source files
- public: static files
- dist/chrome: output Chrome Extension directory
- dist/firefox: output Firefox Extension directory
- dist/{browser}/js: Generated JavaScript files

## Setup

```
npm install
```

## Build for production

```
npm run build
```

## Build for development (in watch mode)x

```
npm run watch
```

## Load extension to browser

Load manifest.json from the appropriate `dist` subdirectory (`chrome` or `firefox`)
