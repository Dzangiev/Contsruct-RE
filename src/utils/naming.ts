/**
 * Sanitizes a string to be a valid identifier (no spaces, starts with letter/underscore).
 */
export function sanitizeName(name: string): string {
  // Replace spaces and special characters with underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Ensure it doesn't start with a number
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }
  
  // Remove consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');
  
  // Trim underscores from start/end
  sanitized = sanitized.replace(/^_+|_+$/g, '');
  
  // If empty or just underscores, return a default
  if (!sanitized) return 'Unnamed';
  
  return sanitized;
}

/**
 * Validates if a name is a valid identifier.
 */
export function isValidName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Returns a unique name by appending a number if the name already exists in the set.
 */
export function getUniqueName(baseName: string, existingNames: string[]): string {
  const sanitized = sanitizeName(baseName);
  let name = sanitized;
  let counter = 2;
  
  const nameSet = new Set(existingNames.map(n => n.toLowerCase()));
  
  while (nameSet.has(name.toLowerCase())) {
    name = `${sanitized}${counter}`;
    counter++;
  }
  
  return name;
}
