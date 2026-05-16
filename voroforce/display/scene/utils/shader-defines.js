export function setShaderDefines(shaderSource, defines = {}) {
  let result = shaderSource
  const processedDefines = new Set()

  // Process each define replacement
  Object.entries(defines).forEach(([key, value]) => {
    // Create regex to match #define KEY with optional value
    const defineRegex = new RegExp(
      `^\\s*#define\\s+${key}\\b(?:\\s+\\S.*)?`,
      'gm',
    )

    // Check if the define exists in the shader
    const hasDefine = defineRegex.test(result)
    defineRegex.lastIndex = 0 // Reset regex

    if (hasDefine) {
      // Replace existing define or remove if value is null/undefined
      if (value !== null && value !== undefined) {
        result = result.replace(
          defineRegex,
          `#define ${key} ${processReplacement(value)}`,
        )
      } else {
        result = result.replace(defineRegex, '')
      }
      processedDefines.add(key)
    }
  })

  // Inject new defines that weren't found in the shader
  Object.entries(defines).forEach(([key, value]) => {
    if (!processedDefines.has(key) && value !== null && value !== undefined) {
      result = injectDefine(result, key, processReplacement(value))
    }
  })

  return result
}

function processReplacement(value) {
  if (typeof value === 'string') {
    return value.replaceAll('\n', '')
  }
  return value
}

function injectDefine(shaderSource, key, value) {
  const lines = shaderSource.split('\n')
  let injected = false

  // Find the best place to inject the define
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Inject after #version if present
    if (line.startsWith('#version')) {
      lines.splice(i + 1, 0, `#define ${key} ${value}`)
      injected = true
      break
    }

    // Inject before the first non-preprocessor, non-empty line
    if (!line.startsWith('#') && line.length > 0 && !injected) {
      lines.splice(i, 0, `#define ${key} ${value}`)
      injected = true
      break
    }
  }

  // If no good place found, inject at the beginning
  if (!injected) {
    lines.unshift(`#define ${key} ${value}`)
  }

  return lines.join('\n')
}
