-- Материализованное представление для остатков товаров (только проведенные документы)
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_summary AS
SELECT 
    p.id,
    p.name,
    p.sku,
    COALESCE(SUM(CASE WHEN d.status = 'posted' THEN i.quantity ELSE 0 END), 0) as total_quantity,
    COUNT(CASE WHEN d.status = 'posted' THEN i.id END) as movement_count,
    MAX(CASE WHEN d.status = 'posted' THEN i.created_at END) as last_movement_date
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
LEFT JOIN documents d ON i.document_id = d.id
WHERE d.status = 'posted' OR d.status IS NULL OR i.id IS NULL
GROUP BY p.id, p.name, p.sku;

-- Создание индекса для быстрого поиска по product_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_summary_product_id 
ON inventory_summary (id);

-- Создание индекса для поиска по названию
CREATE INDEX IF NOT EXISTS idx_inventory_summary_name 
ON inventory_summary USING gin(to_tsvector('russian', name));

-- Материализованное представление для остатков по складам (только проведенные документы)
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_by_warehouse AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    w.id as warehouse_id,
    w.name as warehouse_name,
    COALESCE(SUM(CASE WHEN d.status = 'posted' THEN i.quantity ELSE 0 END), 0) as quantity,
    COUNT(CASE WHEN d.status = 'posted' THEN i.id END) as movement_count,
    MAX(CASE WHEN d.status = 'posted' THEN i.created_at END) as last_movement_date
FROM products p
CROSS JOIN warehouses w
LEFT JOIN inventory i ON p.id = i.product_id AND w.id = i.warehouse_id
LEFT JOIN documents d ON i.document_id = d.id
WHERE d.status = 'posted' OR d.status IS NULL OR i.id IS NULL
GROUP BY p.id, p.name, w.id, w.name;

-- Создание составного индекса
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_warehouse_product_warehouse 
ON inventory_by_warehouse (product_id, warehouse_id);

-- Материализованное представление для доступных остатков (с учетом резервов и только проведенные документы)
CREATE MATERIALIZED VIEW IF NOT EXISTS inventory_availability AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    COALESCE(inv_total.total_quantity, 0) as total_quantity,
    COALESCE(res_total.reserved_quantity, 0) as reserved_quantity,
    COALESCE(inv_total.total_quantity, 0) - COALESCE(res_total.reserved_quantity, 0) as available_quantity
FROM products p
LEFT JOIN (
    SELECT 
        i.product_id, 
        SUM(i.quantity) as total_quantity
    FROM inventory i
    LEFT JOIN documents d ON i.document_id = d.id
    WHERE d.status = 'posted' OR d.status IS NULL
    GROUP BY i.product_id
) inv_total ON p.id = inv_total.product_id
LEFT JOIN (
    SELECT 
        product_id, 
        SUM(quantity) as reserved_quantity
    FROM reserves 
    GROUP BY product_id
) res_total ON p.id = res_total.product_id;

-- Создание индекса для быстрого поиска
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_availability_product_id 
ON inventory_availability (product_id);

-- Функция для обновления всех материализованных представлений
CREATE OR REPLACE FUNCTION refresh_inventory_views() 
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_by_warehouse;
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_availability;
END;
$$ LANGUAGE plpgsql;

-- Создание триггерной функции для автоматического обновления
CREATE OR REPLACE FUNCTION trigger_refresh_inventory_views()
RETURNS trigger AS $$
BEGIN
    -- Обновляем представления асинхронно
    PERFORM refresh_inventory_views();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления при изменении данных
DROP TRIGGER IF EXISTS trigger_inventory_refresh ON inventory;
CREATE TRIGGER trigger_inventory_refresh
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_inventory_views();

DROP TRIGGER IF EXISTS trigger_reserves_refresh ON reserves;
CREATE TRIGGER trigger_reserves_refresh
    AFTER INSERT OR UPDATE OR DELETE ON reserves
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_inventory_views();