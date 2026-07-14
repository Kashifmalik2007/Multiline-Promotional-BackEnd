const fs = require('fs');
const path = require('path');
const { createPool } = require('./db');

const assetsDir = path.join(__dirname, 'public', 'attached_assets');
const pool = createPool();

const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function cleanFilename(filename) {
  // Strip extension
  let base = filename.replace(/\.[^/.]+$/, "");
  
  // Strip timestamps/digits (e.g. 1768642225523_, _1769091178780, 20250101_, etc.)
  // Let's strip any 8+ digit numbers
  base = base.replace(/\d{8,20}/g, '');
  
  // Strip common patterns
  base = base.replace(/wa\d{4}/gi, '');
  base = base.replace(/11zon/gi, '');
  base = base.replace(/removebg-preview/gi, '');
  base = base.replace(/screenshot/gi, '');
  base = base.replace(/img/gi, '');
  base = base.replace(/download/gi, '');
  base = base.replace(/Gemini_Generated_Image/gi, '');
  base = base.replace(/4_CROPS_MONUMENTS/gi, 'Crops Monuments');
  
  // Replace underscores, hyphens, non-alphanumeric chars with spaces
  base = base.replace(/[^a-zA-Z0-9]/g, ' ');
  
  // Trim spaces and collapse multiple spaces
  base = base.trim().replace(/\s+/g, ' ');
  
  // If empty or purely numeric, default name
  if (!base || /^\d+$/.test(base)) {
    base = "Promo Item";
  }
  
  // Capitalize words
  let name = base.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  
  // Custom corrections for user examples and common terms
  const lower = name.toLowerCase();
  if (lower === 'pen') {
    name = 'Premium Pen';
  } else if (lower === 'cufflink') {
    name = 'Premium Cufflinks';
  } else if (lower === 'lapel pin') {
    name = 'Premium Lapel Pin';
  } else if (lower === 'keychain' || lower === 'key chain') {
    name = 'Premium Keychain';
  } else if (lower === 'coin') {
    name = 'Custom Coin';
  } else if (lower === 'cap') {
    name = 'Custom Cap';
  } else if (lower === 'notebook') {
    name = 'Premium Notebook';
  } else if (lower === 'diary') {
    name = 'Executive Diary';
  }
  
  return name;
}

function getCategory(name) {
  const lower = name.toLowerCase();
  
  // Pen, notebook, diary -> Office
  if (lower.includes('pen') || lower.includes('notebook') || lower.includes('diary') || lower.includes('pencil') || lower.includes('shield') || lower.includes('plaque') || lower.includes('award') || lower.includes('statue') || lower.includes('post') || lower.includes('monument') || lower.includes('multan')) {
    return 'Office';
  }
  // Bottle, mug, cup -> Drinkware
  if (lower.includes('bottle') || lower.includes('mug') || lower.includes('cup') || lower.includes('flask') || lower.includes('tumbler') || lower.includes('bowl') || lower.includes('tray')) {
    return 'Drinkware';
  }
  // Bag, shirt, cap -> Apparel
  if (lower.includes('bag') || lower.includes('shirt') || lower.includes('cap') || lower.includes('tshirt') || lower.includes('hoodie') || lower.includes('jacket') || lower.includes('hat') || lower.includes('cufflink')) {
    return 'Apparel';
  }
  // USB, charger, tech -> Tech
  if (lower.includes('usb') || lower.includes('charger') || lower.includes('tech') || lower.includes('powerbank') || lower.includes('clock') || lower.includes('watch') || lower.includes('speaker') || lower.includes('mouse') || lower.includes('keyboard')) {
    return 'Tech';
  }
  // Other items -> Accessories
  return 'Accessories';
}

async function run() {
  try {
    if (!fs.existsSync(assetsDir)) {
      console.error(`Error: Directory not found: ${assetsDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(assetsDir);
    console.log(`Scanning attached_assets folder. Found ${files.length} items.`);

    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    console.log(`Identified ${imageFiles.length} product images to process.`);

    let importedCount = 0;
    let skippedCount = 0;

    for (const filename of imageFiles) {
      const imageUrl = `/attached_assets/${filename}`;

      // Check if product with this image URL already exists in database
      const checkRes = await pool.query('SELECT id FROM products WHERE image_url = $1', [imageUrl]);
      if (checkRes.rows.length > 0) {
        skippedCount++;
        continue;
      }

      const name = cleanFilename(filename);
      const category = getCategory(name);
      const description = `High-quality ${name.toLowerCase()} suitable for corporate gifts and promotional campaigns. Custom brand logo printing and personalization options are available.`;
      
      // SKU derived from name
      const sku = `PROD-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const price = '0.00';
      const moq = 100;

      await pool.query(
        `INSERT INTO products (name, description, sku, price, moq, category, image_url, is_featured, colors, specifications)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          name,
          description,
          sku,
          price,
          moq,
          category,
          imageUrl,
          false, // is_featured
          ['Custom'], // colors
          {} // specifications
        ]
      );

      console.log(`Imported: "${name}" | Category: ${category} | SKU: ${sku}`);
      importedCount++;
    }

    console.log('\n--- Import Summary ---');
    console.log(`Total Products Imported: ${importedCount}`);
    console.log(`Total Products Skipped (Duplicates): ${skippedCount}`);
    console.log('----------------------');

  } catch (error) {
    console.error('Import process failed with error:', error.message || error);
  } finally {
    await pool.end();
  }
}

run();
