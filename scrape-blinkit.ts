#!/usr/bin/env bun

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Types
interface Location {
  latitude: string;
  longitude: string;
}

interface Category {
  l1_category: string;
  l1_category_id: string;
  l2_category: string;
  l2_category_id: string;
}

interface Product {
  product_id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  out_of_stock: boolean;
  images: { url: string }[];
  is_available: boolean;
  is_sponsored?: boolean;
  store_id: string;
}

interface ScrapingResult {
  date: string;
  l1_category: string;
  l1_category_id: string;
  l2_category: string;
  l2_category_id: string;
  store_id: string;
  variant_id: string;
  variant_name: string;
  group_id: string;
  selling_price: number;
  mrp: number;
  in_stock: boolean;
  inventory: string;
  is_sponsored: boolean;
  image_url: string;
  brand_id: string;
  brand: string;
}

// Configuration
const OUTPUT_DIR = 'output';
const DELAY_BETWEEN_REQUESTS_MS = 1000;
const MAX_RETRIES = 3;
const LOCATIONS_CSV = 'blinkit_locations.csv';
const CATEGORIES_CSV = 'blinkit_categories.csv';
const OUTPUT_CSV = 'blinkit_products.csv';

// Logger
class Logger {
  static log(message: string): void {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  static error(message: string, error?: unknown): void {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}`, error);
  }
}

// Helper functions
async function ensureOutputDirectory(): Promise<void> {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    Logger.log(`Output directory ensured: ${OUTPUT_DIR}`);
  } catch (error) {
    Logger.error('Failed to create output directory', error);
    throw error;
  }
}

async function readCsvFile<T>(filePath: string): Promise<T[]> {
  try {
    const file = Bun.file(filePath);
    if (!await file.exists()) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await file.text();
    return content
      .split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = line.split(',');
        return {
          latitude: values[0].replace(/"/g, ''),
          longitude: values[1].replace(/"/g, '')
        } as T;
      });
  } catch (error) {
    Logger.error(`Error reading CSV file: ${filePath}`, error);
    throw error;
  }
}

async function readCategoriesCsv(filePath: string): Promise<Category[]> {
  try {
    const file = Bun.file(filePath);
    if (!await file.exists()) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = await file.text();
    return content
      .split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim() !== '')
      .map(line => {
        const values = line.split(',');
        return {
          l1_category: values[0].replace(/"/g, ''),
          l1_category_id: values[1].replace(/"/g, ''),
          l2_category: values[2].replace(/"/g, ''),
          l2_category_id: values[3].replace(/"/g, '')
        };
      });
  } catch (error) {
    Logger.error(`Error reading CSV file: ${filePath}`, error);
    throw error;
  }
}

// CSV Writer
async function writeCsvFile(filePath: string, data: ScrapingResult[]): Promise<void> {
  const headers = [
    'date', 'l1_category', 'l1_category_id', 'l2_category', 'l2_category_id',
    'store_id', 'variant_id', 'variant_name', 'group_id', 'selling_price',
    'mrp', 'in_stock', 'inventory', 'is_sponsored', 'image_url',
    'brand_id', 'brand'
  ];

  const csvRows = data.map(item => [
    item.date,
    item.l1_category,
    item.l1_category_id,
    item.l2_category,
    item.l2_category_id,
    item.store_id,
    item.variant_id,
    `"${item.variant_name.replace(/"/g, '""')}"`,
    item.group_id,
    item.selling_price,
    item.mrp,
    item.in_stock ? 'true' : 'false',
    item.inventory,
    item.is_sponsored ? 'true' : 'false',
    item.image_url,
    item.brand_id,
    `"${item.brand.replace(/"/g, '""')}"`
  ].join(','));

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  await writeFile(filePath, csvContent);
}

// Scraper
class BlinkItScraper {
  private readonly baseUrl = 'https://blinkit.com/api/catalog/search';

  async scrapeProducts(location: Location, category: Category): Promise<ScrapingResult[]> {
    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const url = `${this.baseUrl}/?q=:relevance:category:${category.l1_category_id}:subCategory:${category.l2_category_id}&lat=${location.latitude}&lng=${location.longitude}`;
        Logger.log(`Scraping: ${url}`);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return this.transformProducts(data, category);
      } catch (error) {
        retries++;
        if (retries >= MAX_RETRIES) {
          Logger.error(`Failed after ${MAX_RETRIES} retries for location ${JSON.stringify(location)} and category ${JSON.stringify(category)}`, error);
          return [];
        }
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS * 2));
      }
    }
    return [];
  }

  private transformProducts(data: any, category: Category): ScrapingResult[] {
    if (!data?.data?.products) {
      throw new Error('Invalid API response format - missing products');
    }

    const products: Product[] = data.data.products;
    const currentDate = new Date().toISOString().split('T')[0];

    return products.map(product => ({
      date: currentDate,
      l1_category: category.l1_category,
      l1_category_id: category.l1_category_id,
      l2_category: category.l2_category,
      l2_category_id: category.l2_category_id,
      store_id: product.store_id || '',
      variant_id: product.product_id || '',
      variant_name: product.name || '',
      group_id: '', // Not available in API
      selling_price: product.price || 0,
      mrp: product.mrp || 0,
      in_stock: product.is_available && !product.out_of_stock,
      inventory: '', // Not available in API
      is_sponsored: product.is_sponsored || false,
      image_url: product.images?.[0]?.url || '',
      brand_id: '', // Not available in API
      brand: product.brand || '',
    }));
  }
}

// Main function
async function main() {
  try {
    Logger.log('Starting BlinkIt scraper');
    await ensureOutputDirectory();

    // Load input data
    const locations = await readCsvFile<Location>(LOCATIONS_CSV);
    const categories = await readCategoriesCsv(CATEGORIES_CSV);

    Logger.log(`Loaded ${locations.length} locations and ${categories.length} categories`);

    // Initialize scraper
    const scraper = new BlinkItScraper();
    const allResults: ScrapingResult[] = [];

    // Process all location-category combinations
    for (const [locIndex, location] of locations.entries()) {
      for (const [catIndex, category] of categories.entries()) {
        const taskNumber = (locIndex * categories.length) + catIndex + 1;
        const totalTasks = locations.length * categories.length;
        
        Logger.log(`Processing task ${taskNumber}/${totalTasks}: ${category.l1_category} > ${category.l2_category} at ${location.latitude},${location.longitude}`);

        const results = await scraper.scrapeProducts(location, category);
        allResults.push(...results);

        // Delay between requests unless it's the last one
        if (taskNumber < totalTasks) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
        }
      }
    }

    // Save results to CSV
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_CSV);
    await writeCsvFile(outputPath, allResults);
    Logger.log(`Saved ${allResults.length} products to ${outputPath}`);

  } catch (error) {
    Logger.error('Fatal error in main process', error);
    process.exit(1);
  }
}

// Run the main function
await main();