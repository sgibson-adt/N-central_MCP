// @ts-check
/** Shared, bounded environment-number parsing. */

/**
 * Parse a numeric setting. Defaults apply only when the setting is absent;
 * explicit invalid values fail startup instead of silently changing behavior.
 *
 * @param {unknown} raw
 * @param {number} fallback
 * @param {{name?: string, minimum?: number, maximum?: number, integer?: boolean}} [options]
 */
export function parseConfiguredNumber(
  raw,
  fallback,
  { name = 'numeric setting', minimum = 0, maximum = Number.MAX_SAFE_INTEGER, integer = false } = {},
) {
  if (raw == null || String(raw).trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)
    || value < minimum
    || value > maximum
    || (integer && !Number.isInteger(value))) {
    const shape = integer ? 'an integer' : 'a finite number';
    throw new RangeError(`Invalid ${name}: expected ${shape} from ${minimum} through ${maximum}`);
  }
  return value;
}

/**
 * Read and parse one numeric environment setting.
 * @param {string} name
 * @param {number} fallback
 * @param {{minimum?: number, maximum?: number, integer?: boolean}} [options]
 */
export function configuredNumber(name, fallback, options) {
  return parseConfiguredNumber(process.env[name], fallback, { ...options, name });
}
