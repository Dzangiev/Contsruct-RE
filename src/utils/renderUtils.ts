/**
 * Utility functions for rendering objects in the Viewport and Runtime.
 */

export interface Effect {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  disabled?: boolean;
}

/**
 * Converts an array of effect objects into a CSS filter string compatible with SVG and DOM.
 */
export const getEffectsFilter = (effects: Effect[] = []): string | undefined => {
  if (effects.length === 0) return undefined;
  
  const filter = effects
    .filter(e => !e.disabled)
    .map(e => {
      switch (e.type) {
        case 'blur': return `blur(${e.properties.intensity ?? 0}px)`;
        case 'grayscale': return `grayscale(${e.properties.amount ?? 0})`;
        case 'sepia': return `sepia(${e.properties.amount ?? 0})`;
        case 'hue-rotate': return `hue-rotate(${e.properties.angle ?? 0}deg)`;
        case 'brightness-contrast': {
          const b = e.properties.brightness ?? 1;
          const c = e.properties.contrast ?? 1;
          return `brightness(${b}) contrast(${c})`;
        }
        case 'invert': return `invert(${e.properties.amount ?? 0})`;
        default: return '';
      }
    })
    .filter(Boolean)
    .join(' ');
    
  return filter || undefined;
};
