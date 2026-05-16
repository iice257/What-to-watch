const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
}

const LOG_COLORS = {
  ERROR: '#ff4444',
  WARN: '#ffaa00',
  INFO: '#4488ff',
  DEBUG: '#888888',
  TRACE: '#666666',
}

class Logger {
  constructor(namespace = 'voroforce', level = LOG_LEVELS.INFO) {
    this.namespace = namespace
    this.level = level
    this.enabled = true
  }

  setLevel(level) {
    if (typeof level === 'string') {
      this.level = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO
    } else {
      this.level = level
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled
  }

  createChild(childNamespace) {
    return new Logger(`${this.namespace}:${childNamespace}`, this.level)
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const prefix = `[${timestamp}] ${this.namespace} ${level}:`
    return [prefix, message, ...args]
  }

  log(level, levelName, message, ...args) {
    if (!this.enabled || level > this.level) return

    const formattedArgs = this.formatMessage(levelName, message, ...args)
    const color = LOG_COLORS[levelName]

    if (typeof window !== 'undefined' && window.console) {
      console.log(
        `%c${formattedArgs[0]}`,
        `color: ${color}; font-weight: bold;`,
        ...formattedArgs.slice(1),
      )
    } else {
      console.log(...formattedArgs)
    }
  }

  error(message, ...args) {
    this.log(LOG_LEVELS.ERROR, 'ERROR', message, ...args)
  }

  warn(message, ...args) {
    this.log(LOG_LEVELS.WARN, 'WARN', message, ...args)
  }

  info(message, ...args) {
    this.log(LOG_LEVELS.INFO, 'INFO', message, ...args)
  }

  debug(message, ...args) {
    this.log(LOG_LEVELS.DEBUG, 'DEBUG', message, ...args)
  }

  trace(message, ...args) {
    this.log(LOG_LEVELS.TRACE, 'TRACE', message, ...args)
  }

  group(label, collapsed = false) {
    if (!this.enabled) return
    if (typeof window !== 'undefined' && window.console) {
      if (collapsed) {
        console.groupCollapsed(`${this.namespace}: ${label}`)
      } else {
        console.group(`${this.namespace}: ${label}`)
      }
    }
  }

  groupEnd() {
    if (!this.enabled) return
    if (typeof window !== 'undefined' && window.console) {
      console.groupEnd()
    }
  }

  time(label) {
    if (!this.enabled) return
    if (typeof window !== 'undefined' && window.console) {
      console.time(`${this.namespace}:${label}`)
    }
  }

  timeEnd(label) {
    if (!this.enabled) return
    if (typeof window !== 'undefined' && window.console) {
      console.timeEnd(`${this.namespace}:${label}`)
    }
  }

  table(data) {
    if (!this.enabled || this.level < LOG_LEVELS.DEBUG) return
    if (typeof window !== 'undefined' && window.console && console.table) {
      console.table(data)
    }
  }
}

// Create default logger instance
const defaultLogger = new Logger('voroforce')

// Configure based on environment
if (typeof window !== 'undefined') {
  // Browser environment - check URL params and localStorage
  const params = new URLSearchParams(window.location.search)
  const debugParam = params.get('debug')
  const storedLevel = localStorage.getItem('voroforce-log-level')

  if (debugParam) {
    defaultLogger.setLevel(debugParam.toUpperCase())
  } else if (storedLevel) {
    defaultLogger.setLevel(storedLevel)
  }

  // Expose logger to window for debugging
  window.voroforceLogger = defaultLogger
} else {
  // // Node.js environment - check environment variables
  // const envLevel = process.env.VOROFORCE_LOG_LEVEL
  // if (envLevel) {
  //   defaultLogger.setLevel(envLevel)
  // }
}

// Factory function for creating named loggers
export function createLogger(namespace, level) {
  return new Logger(namespace, level ?? defaultLogger.level)
}

// Export default logger and utilities
export { Logger, LOG_LEVELS, defaultLogger as logger }
