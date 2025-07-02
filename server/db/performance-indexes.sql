-- Индексы для повышения производительности ERP системы

-- Продукты: поиск по названию, SKU, штрихкоду
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('russian', name));
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE barcode IS NOT NULL;

-- Документы: сортировка по дате, фильтрация по типу и статусу
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_type_status ON documents(type, status);
CREATE INDEX IF NOT EXISTS idx_documents_warehouse_id ON documents(warehouse_id);

-- Позиции документов: связь с продуктами и документами
CREATE INDEX IF NOT EXISTS idx_document_items_document_id ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_document_items_product_id ON document_items(product_id);

-- Инвентарь: быстрые запросы остатков
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity) WHERE quantity > 0;

-- Заказы: сортировка по дате, фильтрация по контрагенту
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_contractor_id ON orders(contractor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status) WHERE status IS NOT NULL;

-- Резервы: быстрый поиск по продукту и заказу  
CREATE INDEX IF NOT EXISTS idx_reserves_product_order ON reserves(product_id, order_id);
CREATE INDEX IF NOT EXISTS idx_reserves_quantity ON reserves(quantity) WHERE quantity > 0;

-- Логи: поиск по уровню, модулю и времени
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_service ON logs(service);
CREATE INDEX IF NOT EXISTS idx_logs_level_service_time ON logs(level, service, timestamp DESC);

-- Составные индексы для сложных запросов
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse_product_qty ON inventory(warehouse_id, product_id) 
  WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_documents_type_warehouse_date ON documents(type, warehouse_id, created_at DESC);

-- Частичные индексы для активных записей
CREATE INDEX IF NOT EXISTS idx_active_orders ON orders(created_at DESC) 
  WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_posted_documents ON documents(created_at DESC) 
  WHERE status = 'posted';

-- Покрывающие индексы для частых запросов  
CREATE INDEX IF NOT EXISTS idx_products_list_covering ON products(id, name, sku, price) 
  WHERE price IS NOT NULL;

-- Анализ статистики для оптимизатора
ANALYZE products;
ANALYZE documents;
ANALYZE document_items;
ANALYZE inventory;
ANALYZE orders;
ANALYZE reserves;
ANALYZE logs;

-- Добавление комментариев для документации
COMMENT ON INDEX idx_products_name IS 'Full-text search по названиям продуктов';
COMMENT ON INDEX idx_documents_created_at IS 'Сортировка документов по дате создания';
COMMENT ON INDEX idx_inventory_product_warehouse IS 'Быстрый поиск остатков по продукту и складу';
COMMENT ON INDEX idx_logs_level_service_time IS 'Составной индекс для фильтрации логов';