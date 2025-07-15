# BlinkIt Subcategory Scraper

This script (`scrape-blinkit.ts`) scrapes product data from BlinkIt subcategory pages using a list of locations and category/subcategory pairs.

## Features

- Iterates over all combinations of locations and categories/subcategories.
- Fetches data from the BlinkIt API for each combination.
- Handles errors and logs results.
- Outputs all results to `scraped_results.json`.
- **NEW**: Supports both Bun and Yarn package managers!

## Requirements

Choose one of the following setups:

### Option 1: Bun (Recommended)
- [Bun](https://bun.sh/) (for running TypeScript/Node.js scripts)
- Node.js-compatible environment (Bun supports most Node.js APIs)

### Option 2: Yarn + Node.js
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [Yarn](https://yarnpkg.com/) package manager
- [tsx](https://github.com/esbuild-kit/tsx) for TypeScript execution

## Input Files

Place these files in the same directory as the script:

### 1. `blinkit_locations.csv`

CSV with columns:
```
latitude,longitude
28.678051,77.314262
...
```

### 2. `blinkit_categories.csv`

CSV with columns:
```
l1_category,l1_category_id,l2_category,l2_category_id
Munchies,1237,Bhujia & Mixtures,1178
...
```

## Installation

### Using Bun (Recommended)

Install dependencies using Bun:

```sh
bun install
# or
bun add csv-parse
bun add -d @types/node
```

### Using Yarn

Install dependencies using Yarn:

```sh
yarn install
# or manually install dependencies
yarn add csv-parse
yarn add -D @types/node tsx
```

## Usage

### Using Bun

Run the script with Bun:

```sh
bun run start
# or
bun run scrape-blinkit.ts
```

### Using Yarn

Run the script with Yarn:

```sh
yarn start:yarn
# or
yarn tsx scrape-blinkit.ts
```

## Available Scripts

- `npm run start` / `yarn start` - Run with Bun (default)
- `npm run start:bun` / `yarn start:bun` - Run with Bun explicitly
- `npm run start:yarn` / `yarn start:yarn` - Run with Yarn + tsx
- `npm run install:bun` / `yarn install:bun` - Install dependencies with Bun
- `npm run install:yarn` / `yarn install:yarn` - Install dependencies with Yarn

## Output

- Results are saved to `scraped_results.json` in the current directory.
- Each entry contains the location, category, and the raw API response or error.

## Troubleshooting

- If you see `HTTP 403` errors, the BlinkIt API may be protected by authentication, anti-bot measures, or may require different parameters (e.g., slugs instead of IDs).
- Ensure your input CSV files use the correct headers and are in the same directory as the script.
- The script currently uses the endpoint:
  ```
  https://www.blinkit.com/api/v1/storefront?lat={lat}&lng={lng}&category_id={L1_category_id}&subcategory_id={L2_category_id}
  ```
  This may need to be updated if BlinkIt changes their API or uses slugs.

## Package Manager Comparison

| Feature | Bun | Yarn |
|---------|-----|------|
| TypeScript Support | Native | Requires tsx |
| Installation Speed | Faster | Standard |
| Bundle Size | Smaller | Standard |
| Node.js Compatibility | High | Native |

## Notes

- This script is for educational and research purposes only.
- Respect BlinkIt's terms of service and robots.txt.
- Both Bun and Yarn are fully supported - choose based on your preference and existing setup.