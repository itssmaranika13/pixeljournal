/**
 * Convert hex color to HSL
 */
function hexToHSL(hex) {
  // Remove the hash if present
  hex = hex.replace('#', '');

  // Parse the hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate distinguishable shades for subcategories based on parent category color
 * @param {string} baseColor - Hex color of the parent category
 * @param {number} count - Number of subcategories
 * @returns {string[]} Array of hex colors for subcategories
 */
export function generateSubcategoryShades(baseColor, count) {
  if (count === 0) return [];
  if (count === 1) return [baseColor];

  const hsl = hexToHSL(baseColor);
  const shades = [];

  // Generate shades by varying lightness
  // Spread evenly across a range that maintains visibility
  const minLightness = Math.max(20, hsl.l - 30);
  const maxLightness = Math.min(80, hsl.l + 30);
  const lightnessRange = maxLightness - minLightness;
  const lightnessStep = lightnessRange / (count - 1);

  for (let i = 0; i < count; i++) {
    let newLightness;
    
    if (count === 1) {
      newLightness = hsl.l;
    } else if (count === 2) {
      // For 2 subcategories, make one lighter and one darker
      newLightness = i === 0 ? hsl.l - 15 : hsl.l + 15;
    } else {
      // For 3+, distribute evenly
      newLightness = minLightness + (lightnessStep * i);
    }

    // Ensure lightness stays in valid range
    newLightness = Math.max(15, Math.min(85, newLightness));

    // Slightly vary saturation for more distinction
    let newSaturation = hsl.s + (i % 2 === 0 ? -5 : 5);
    newSaturation = Math.max(20, Math.min(100, newSaturation));

    const shade = hslToHex(hsl.h, newSaturation, newLightness);
    shades.push(shade);
  }

  return shades;
}

/**
 * Get a specific shade for a subcategory
 * @param {string} baseColor - Hex color of the parent category
 * @param {number} index - Index of the subcategory
 * @param {number} total - Total number of subcategories
 * @returns {string} Hex color for this subcategory
 */
export function getSubcategoryShade(baseColor, index, total) {
  const shades = generateSubcategoryShades(baseColor, total);
  return shades[index] || baseColor;
}

/**
 * Get color for a category or subcategory
 * @param {object} category - Category object
 * @param {number|null} subcategoryIndex - Index of subcategory, or null for main category
 * @returns {string} Hex color
 */
export function getCategoryColor(category, subcategoryIndex = null) {
  const baseColor = category.color || '#6b7280'; // default grey
  
  if (subcategoryIndex === null || !category.subcategories || category.subcategories.length === 0) {
    return baseColor;
  }

  const subcategoryColor = category.subcategories[subcategoryIndex]?.color;
  if (subcategoryColor) return subcategoryColor;

  return getSubcategoryShade(baseColor, subcategoryIndex, category.subcategories.length);
}
