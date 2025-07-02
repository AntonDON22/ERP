-- Миграция типов документов с русских на английские

-- 1. Создаем enum тип
CREATE TYPE document_type_enum AS ENUM ('income', 'outcome', 'return');

-- 2. Обновляем существующие записи
UPDATE documents SET type = CASE 
  WHEN type = 'Оприходование' THEN 'income'
  WHEN type = 'Списание' THEN 'outcome' 
  WHEN type = 'Возврат' THEN 'return'
  ELSE 'income'
END;

-- 3. Изменяем тип колонки
ALTER TABLE documents 
ALTER COLUMN type TYPE document_type_enum 
USING type::document_type_enum;

-- 4. Устанавливаем значение по умолчанию
ALTER TABLE documents 
ALTER COLUMN type SET DEFAULT 'income';

-- 5. Делаем колонку NOT NULL если еще не сделано
ALTER TABLE documents 
ALTER COLUMN type SET NOT NULL;