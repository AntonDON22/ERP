/**
 * Агрегатор ошибок для сбора всех проблем во время тестирования
 */

export interface TestError {
  step: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ErrorAggregator {
  private errors: TestError[] = [];
  private warnings: TestError[] = [];

  /**
   * Добавить ошибку в агрегатор
   */
  addError(step: string, message: string, details?: any): void {
    this.errors.push({
      step,
      message,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Добавить предупреждение в агрегатор
   */
  addWarning(step: string, message: string, details?: any): void {
    this.warnings.push({
      step,
      message,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Проверить наличие ошибок
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Проверить наличие предупреждений
   */
  hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  /**
   * Получить количество ошибок
   */
  getErrorCount(): number {
    return this.errors.length;
  }

  /**
   * Получить количество предупреждений
   */
  getWarningCount(): number {
    return this.warnings.length;
  }

  /**
   * Получить все ошибки
   */
  getErrors(): TestError[] {
    return [...this.errors];
  }

  /**
   * Получить все предупреждения
   */
  getWarnings(): TestError[] {
    return [...this.warnings];
  }

  /**
   * Очистить все ошибки и предупреждения
   */
  clear(): void {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Получить краткую сводку
   */
  getSummary(): string {
    if (!this.hasErrors() && !this.hasWarnings()) {
      return "✅ Все проверки пройдены";
    }

    const parts: string[] = [];
    
    if (this.hasErrors()) {
      parts.push(`${this.getErrorCount()} ошибок`);
    }
    
    if (this.hasWarnings()) {
      parts.push(`${this.getWarningCount()} предупреждений`);
    }

    return `❌ Обнаружено ${parts.join(', ')}`;
  }

  /**
   * Получить детальный отчет
   */
  getDetailedReport(): string {
    const lines = [];
    
    lines.push('\n📊 ДЕТАЛЬНЫЙ ОТЧЕТ О ТЕСТИРОВАНИИ');
    lines.push('='.repeat(50));
    
    if (this.hasErrors()) {
      lines.push('\n❌ ОШИБКИ:');
      this.errors.forEach((error, index) => {
        lines.push(`${index + 1}. [${error.step}] ${error.message}`);
        if (error.details) {
          lines.push(`   Детали: ${JSON.stringify(error.details)}`);
        }
      });
    }
    
    if (this.hasWarnings()) {
      lines.push('\n⚠️ ПРЕДУПРЕЖДЕНИЯ:');
      this.warnings.forEach((warning, index) => {
        lines.push(`${index + 1}. [${warning.step}] ${warning.message}`);
        if (warning.details) {
          lines.push(`   Детали: ${JSON.stringify(warning.details)}`);
        }
      });
    }
    
    if (!this.hasErrors() && !this.hasWarnings()) {
      lines.push('\n✅ Проблем не обнаружено');
    }
    
    lines.push('='.repeat(50));
    return lines.join('\n');
  }

  /**
   * Безопасное выполнение функции с перехватом ошибок
   */
  async safeExecute<T>(
    step: string, 
    operation: () => Promise<T>,
    continueOnError: boolean = true
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.addError(step, error instanceof Error ? error.message : String(error), error);
      
      if (!continueOnError) {
        throw error;
      }
      
      return null;
    }
  }

  /**
   * Безопасная проверка с добавлением в агрегатор
   */
  check(step: string, condition: boolean, errorMessage: string, warningMessage?: string): boolean {
    if (!condition) {
      if (warningMessage) {
        this.addWarning(step, warningMessage);
      } else {
        this.addError(step, errorMessage);
      }
    }
    return condition;
  }
}