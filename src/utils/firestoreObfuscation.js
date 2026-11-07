const ENCODED_PREFIX = 'b64:';

function encodeText(value) {
  if (typeof value !== 'string' || value.startsWith(ENCODED_PREFIX)) return value;

  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return `${ENCODED_PREFIX}${btoa(binary)}`;
}

function decodeText(value) {
  if (typeof value !== 'string' || !value.startsWith(ENCODED_PREFIX)) return value;

  try {
    const binary = atob(value.slice(ENCODED_PREFIX.length));
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    return value;
  }
}

export function encodeUserProfile(profile) {
  if (!profile) return profile;
  const encodedProfile = { ...profile };
  if (Object.prototype.hasOwnProperty.call(profile, 'name')) {
    encodedProfile.name = encodeText(profile.name);
  }
  return encodedProfile;
}

export function decodeUserProfile(profile) {
  if (!profile) return profile;
  const decodedProfile = { ...profile };
  if (Object.prototype.hasOwnProperty.call(profile, 'name')) {
    decodedProfile.name = decodeText(profile.name);
  }
  return decodedProfile;
}

export function encodeCategory(category) {
  if (!category) return category;
  const encodedCategory = { ...category };
  if (Object.prototype.hasOwnProperty.call(category, 'name')) {
    encodedCategory.name = encodeText(category.name);
  }
  if (Object.prototype.hasOwnProperty.call(category, 'emoji')) {
    encodedCategory.emoji = encodeText(category.emoji);
  }
  if (Array.isArray(category.subcategories)) {
    encodedCategory.subcategories = category.subcategories.map(subcategory => ({
      ...subcategory,
      name: encodeText(subcategory.name)
    }));
  }
  return encodedCategory;
}

export function decodeCategory(category) {
  if (!category) return category;
  const decodedCategory = { ...category };
  if (Object.prototype.hasOwnProperty.call(category, 'name')) {
    decodedCategory.name = decodeText(category.name);
  }
  if (Object.prototype.hasOwnProperty.call(category, 'emoji')) {
    decodedCategory.emoji = decodeText(category.emoji);
  }
  if (Array.isArray(category.subcategories)) {
    decodedCategory.subcategories = category.subcategories.map(subcategory => ({
      ...subcategory,
      name: decodeText(subcategory.name)
    }));
  }
  return decodedCategory;
}

export function encodeEntry(entry) {
  if (!entry) return entry;
  const encodedEntry = { ...entry };
  if (Object.prototype.hasOwnProperty.call(entry, 'notes')) {
    encodedEntry.notes = encodeText(entry.notes);
  }
  return encodedEntry;
}

export function decodeEntry(entry) {
  if (!entry) return entry;
  const decodedEntry = { ...entry };
  if (Object.prototype.hasOwnProperty.call(entry, 'notes')) {
    decodedEntry.notes = decodeText(entry.notes);
  }
  return decodedEntry;
}
