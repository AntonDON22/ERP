import { describe, it, expect } from 'vitest';
import { zNotes, zDate, zOrderStatus, zIdString } from '../../shared/zFields';

/**
 * Тесты для новых централизованных полей валидации
 * Проверяет корректность работы zNotes, zDate, zOrderStatus, zIdString
 */

describe('New Fields Validation Tests', () => {
  
  describe('zNotes - поле примечаний', () => {
    
    it('должен принимать валидные примечания', () => {
      expect(zNotes.parse("Важные примечания")).toBe("Важные примечания");
      expect(zNotes.parse("")).toBe(undefined);
      expect(zNotes.parse(undefined)).toBe(undefined);
    });
    
    it('должен обрезать пробелы', () => {
      expect(zNotes.parse("  Примечание с пробелами  ")).toBe("Примечание с пробелами");
    });
    
    it('должен отклонять слишком длинные примечания', () => {
      const longText = "a".repeat(1001);
      expect(() => zNotes.parse(longText)).toThrow("Примечания не должны превышать 1000 символов");
    });
    
    it('должен принимать максимально допустимую длину', () => {
      const maxText = "a".repeat(1000);
      expect(zNotes.parse(maxText)).toBe(maxText);
    });
  });
  
  describe('zDate - поле даты', () => {
    
    it('должен принимать валидные даты', () => {
      expect(zDate.parse("2025-07-02")).toBe("2025-07-02");
      expect(zDate.parse("2025-12-31")).toBe("2025-12-31");
      expect(zDate.parse(undefined)).toBe(undefined);
    });
    
    it('должен принимать различные форматы дат', () => {
      expect(zDate.parse("2025/07/02")).toBe("2025/07/02");
      expect(zDate.parse("Jul 2, 2025")).toBe("Jul 2, 2025");
    });
    
    it('должен отклонять некорректные даты', () => {
      expect(() => zDate.parse("invalid-date")).toThrow("Некорректная дата");
      expect(() => zDate.parse("2025-13-32")).toThrow("Некорректная дата");
      expect(() => zDate.parse("abc")).toThrow("Некорректная дата");
    });
  });
  
  describe('zOrderStatus - статус заказа', () => {
    
    it('должен принимать валидные статусы', () => {
      expect(zOrderStatus.parse("Новый")).toBe("Новый");
      expect(zOrderStatus.parse("В работе")).toBe("В работе");
      expect(zOrderStatus.parse("Выполнен")).toBe("Выполнен");
      expect(zOrderStatus.parse("Отменен")).toBe("Отменен");
    });
    
    it('должен отклонять некорректные статусы', () => {
      expect(() => zOrderStatus.parse("Неизвестный")).toThrow("Некорректный статус заказа");
      expect(() => zOrderStatus.parse("")).toThrow("Некорректный статус заказа");
      expect(() => zOrderStatus.parse("новый")).toThrow("Некорректный статус заказа"); // регистр важен
    });
  });
  
  describe('zIdString - ID в строковом формате', () => {
    
    it('должен принимать валидные строковые ID', () => {
      expect(zIdString.parse("1")).toBe(1);
      expect(zIdString.parse("123")).toBe(123);
      expect(zIdString.parse("999999")).toBe(999999);
    });
    
    it('должен отклонять некорректные строки', () => {
      expect(() => zIdString.parse("0")).toThrow("ID должен быть положительным числом");
      expect(() => zIdString.parse("-1")).toThrow("ID должен содержать только цифры");
      expect(() => zIdString.parse("1.5")).toThrow("ID должен содержать только цифры");
      expect(() => zIdString.parse("abc")).toThrow("ID должен содержать только цифры");
      expect(() => zIdString.parse("")).toThrow("ID должен содержать только цифры");
    });
    
    it('должен отклонять слишком большие числа', () => {
      const veryLargeNumber = (Number.MAX_SAFE_INTEGER + 1).toString();
      expect(() => zIdString.parse(veryLargeNumber)).toThrow("ID должен быть положительным числом");
    });
    
    it('должен автоматически преобразовывать в число', () => {
      const result = zIdString.parse("42");
      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });
  });
  
  describe('Интеграция с существующими схемами', () => {
    
    it('должен работать с комбинацией полей', () => {
      // Тестируем как будут работать новые поля в реальных схемах
      const orderData = {
        notes: "  Важный заказ  ",
        date: "2025-07-02",
        status: "Новый"
      };
      
      expect(zNotes.parse(orderData.notes)).toBe("Важный заказ");
      expect(zDate.parse(orderData.date)).toBe("2025-07-02");
      expect(zOrderStatus.parse(orderData.status)).toBe("Новый");
    });
    
    it('должен обрабатывать пустые/optional значения', () => {
      expect(zNotes.parse(undefined)).toBe(undefined);
      expect(zDate.parse(undefined)).toBe(undefined);
      
      // zOrderStatus не optional по умолчанию
      expect(() => zOrderStatus.parse(undefined)).toThrow();
    });
  });
  
  describe('Граничные случаи', () => {
    
    it('должен обрабатывать специальные символы в примечаниях', () => {
      const specialText = "Заказ #123 @ 50% скидка (важно!)";
      expect(zNotes.parse(specialText)).toBe(specialText);
    });
    
    it('должен работать с датами на границе диапазонов', () => {
      expect(zDate.parse("1970-01-01")).toBe("1970-01-01"); // Unix epoch
      expect(zDate.parse("2038-01-19")).toBe("2038-01-19"); // Near future
    });
    
    it('должен обрабатывать русские символы', () => {
      expect(zNotes.parse("Примечание на русском языке")).toBe("Примечание на русском языке");
      expect(zOrderStatus.parse("В работе")).toBe("В работе");
    });
  });
});