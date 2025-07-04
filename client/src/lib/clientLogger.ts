/**
 * 🔧 ЦЕНТРАЛИЗОВАННЫЙ КЛИЕНТСКИЙ ЛОГГЕР
 * 
 * Унифицированная система логирования для фронтенда с автоматической
 * отправкой критических ошибок на сервер и условным выводом в dev-режиме
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  component?: string;
  userId?: string;
}

class ClientLogger {
  private isDev = process.env.NODE_ENV === 'development';
  private apiEndpoint = '/api/logs/client';

  /**
   * Внутренний метод логирования
   */
  private log(level: LogLevel, module: string, message: string, data?: any, component?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      component
    };

    // В dev-режиме выводим в консоль
    if (this.isDev) {
      const prefix = `[${level}] ${entry.timestamp} [${module}]`;
      const fullMessage = component ? `${prefix} ${component}: ${message}` : `${prefix} ${message}`;
      
      switch (level) {
        case 'DEBUG':
          console.debug(fullMessage, data);
          break;
        case 'INFO':
          console.info(fullMessage, data);
          break;
        case 'WARN':
          console.warn(fullMessage, data);
          break;
        case 'ERROR':
          console.error(fullMessage, data);
          break;
      }
    }

    // Отправляем критические ошибки на сервер
    if (level === 'ERROR') {
      this.sendToServer(entry);
    }
  }

  /**
   * Отправка логов на сервер (только для ERROR)
   */
  private async sendToServer(entry: LogEntry) {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Фоновая отправка - не блокируем UI при ошибках
      if (this.isDev) {
        console.warn('Failed to send log to server:', error);
      }
    }
  }

  /**
   * Отладочные сообщения (только в dev)
   */
  debug(module: string, message: string, data?: any, component?: string) {
    this.log('DEBUG', module, message, data, component);
  }

  /**
   * Информационные сообщения
   */
  info(module: string, message: string, data?: any, component?: string) {
    this.log('INFO', module, message, data, component);
  }

  /**
   * Предупреждения
   */
  warn(module: string, message: string, data?: any, component?: string) {
    this.log('WARN', module, message, data, component);
  }

  /**
   * Ошибки (отправляются на сервер)
   */
  error(module: string, message: string, data?: any, component?: string) {
    this.log('ERROR', module, message, data, component);
  }

  /**
   * Специализированные методы для типичных сценариев
   */
  
  /**
   * Логирование операций с формами
   */
  formOperation(component: string, operation: string, data?: any) {
    this.debug('forms', `${operation} operation`, data, component);
  }

  /**
   * Логирование блокировки дублирующих запросов
   */
  blockDuplicate(component: string, submissionId: string | number, reason: string) {
    this.debug('forms', `Blocked duplicate submission #${submissionId} - ${reason}`, { submissionId, reason }, component);
  }

  /**
   * Логирование успешных операций
   */
  operationSuccess(component: string, operation: string, data?: any) {
    this.info('operations', `${operation} completed successfully`, data, component);
  }

  /**
   * Логирование ошибок операций
   */
  operationError(component: string, operation: string, error: any) {
    this.error('operations', `${operation} failed`, { error: error.message || error }, component);
  }

  /**
   * Логирование валидации форм
   */
  validationError(component: string, errors: any) {
    this.warn('validation', 'Form validation failed', errors, component);
  }
}

// Экспортируем singleton
export const clientLogger = new ClientLogger();

// Именованные экспорты для удобства
export const logFormOperation = clientLogger.formOperation.bind(clientLogger);
export const logBlockDuplicate = clientLogger.blockDuplicate.bind(clientLogger);
export const logOperationSuccess = clientLogger.operationSuccess.bind(clientLogger);
export const logOperationError = clientLogger.operationError.bind(clientLogger);
export const logValidationError = clientLogger.validationError.bind(clientLogger);