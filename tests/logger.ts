import * as fs from 'fs';
import * as path from 'path';
import { testConfig } from './config';

/**
 * Система логирования для интеграционных тестов
 */
export class TestLogger {
  private logFile: string;
  private logStream: fs.WriteStream;

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(process.cwd(), `test_results_${timestamp}.log`);
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'w' });
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toLocaleString('ru-RU', { 
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `${timestamp} [${level}] ${message}`;
  }

  private shouldLog(level: string): boolean {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const configLevel = levels.indexOf(testConfig.logLevel);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private log(level: string, message: string, emoji?: string): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message);
    const consoleMessage = emoji ? `${emoji} ${message}` : message;
    
    // Вывод в консоль с цветами
    if (level === 'ERROR') {
      console.error(`❌ ${consoleMessage}`);
    } else if (level === 'WARN') {
      console.warn(`⚠️ ${consoleMessage}`);
    } else if (level === 'INFO') {
      console.log(`ℹ️ ${consoleMessage}`);
    } else {
      console.log(consoleMessage);
    }

    // Запись в файл
    this.logStream.write(formattedMessage + '\n');
  }

  debug(message: string): void {
    this.log('DEBUG', message, '🔍');
  }

  info(message: string): void {
    this.log('INFO', message, 'ℹ️');
  }

  warn(message: string): void {
    this.log('WARN', message, '⚠️');
  }

  error(message: string): void {
    this.log('ERROR', message, '❌');
  }

  success(message: string): void {
    this.log('INFO', message, '✅');
  }

  step(message: string): void {
    this.log('INFO', message, '🔹');
  }

  header(message: string): void {
    const separator = '='.repeat(50);
    this.log('INFO', `\n${separator}\n${message}\n${separator}`);
  }

  close(): void {
    this.logStream.end();
  }

  getLogFile(): string {
    return this.logFile;
  }
}

export const logger = new TestLogger();