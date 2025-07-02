import { formatMoscowDateTime } from './timeUtils';

// Импортируем типы для базы данных
let db: any = null;
let logs: any = null;

// Ленивая инициализация для избежания циклических зависимостей
const initDB = async () => {
  if (!db) {
    try {
      const dbModule = await import('../server/db');
      const schemaModule = await import('./schema');
      db = dbModule.db;
      logs = schemaModule.logs;
    } catch (error) {
      // В случае ошибки просто логируем в консоль
      console.warn('Failed to initialize database for logging:', error);
    }
  }
};

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  meta?: Record<string, any>;
  duration?: number;
}

class Logger {
  private minLevel: LogLevel;
  private serviceName: string;

  constructor(serviceName: string = 'app', minLevel: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.minLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : minLevel;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>, duration?: number) {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: formatMoscowDateTime(),
      level,
      service: this.serviceName,
      message,
      meta,
      duration
    };

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const levelColors = ['\x1b[36m', '\x1b[32m', '\x1b[33m', '\x1b[31m']; // cyan, green, yellow, red
    const resetColor = '\x1b[0m';

    let logMessage = `${levelColors[level]}[${levelNames[level]}]${resetColor} ${entry.timestamp} [${this.serviceName}] ${message}`;
    
    if (duration !== undefined) {
      logMessage += ` (${duration}ms)`;
    }

    if (meta && Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    // Логируем в консоль
    console.log(logMessage);

    // Пытаемся записать в базу данных (асинхронно, без блокировки)
    this.writeToDatabase(level, message, meta, duration).catch(error => {
      // Если не удалось записать в БД - не падаем, просто предупреждаем
      console.warn('Failed to write log to database:', error.message);
    });
  }

  private async writeToDatabase(level: LogLevel, message: string, meta?: Record<string, any>, duration?: number) {
    await initDB();
    
    if (!db || !logs) {
      return; // База данных недоступна
    }

    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const details = meta || duration ? JSON.stringify({ meta, duration }) : null;

    try {
      await db.insert(logs).values({
        level: levelNames[level],
        message,
        module: this.serviceName,
        details
      });
    } catch (error) {
      // Тихо игнорируем ошибки записи в БД
      throw error;
    }
  }

  debug(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, meta);
  }

  // Специальный метод для логирования производительности
  performance(operation: string, duration: number, meta?: Record<string, any>) {
    this.log(LogLevel.INFO, `Performance: ${operation}`, meta, duration);
  }

  // Метод для логирования начала операции
  startOperation(operation: string, meta?: Record<string, any>): () => void {
    const startTime = Date.now();
    this.debug(`Starting: ${operation}`, meta);
    
    return () => {
      const duration = Date.now() - startTime;
      this.performance(operation, duration, meta);
    };
  }
}

// Создаем экземпляры логгеров для разных сервисов
export const logger = new Logger('app');
export const dbLogger = new Logger('database');
export const apiLogger = new Logger('api');
export const inventoryLogger = new Logger('inventory');
export const materializedLogger = new Logger('materialized-views');

// Функция для создания нового логгера для конкретного сервиса
export function createLogger(serviceName: string, minLevel?: LogLevel): Logger {
  return new Logger(serviceName, minLevel);
}

// Утилитарная функция для безопасного извлечения сообщения об ошибке
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}