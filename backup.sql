--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: document_type_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.document_type_enum AS ENUM (
    'income',
    'outcome',
    'return'
);


ALTER TYPE public.document_type_enum OWNER TO neondb_owner;

--
-- Name: shipment_status_enum; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.shipment_status_enum AS ENUM (
    'draft',
    'prepared',
    'shipped',
    'delivered',
    'cancelled'
);


ALTER TYPE public.shipment_status_enum OWNER TO neondb_owner;

--
-- Name: atomic_refresh_inventory_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.atomic_refresh_inventory_views() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Атомарное обновление представлений с обработкой ошибок
  BEGIN
    REFRESH MATERIALIZED VIEW inventory_summary;
    REFRESH MATERIALIZED VIEW inventory_availability;
  EXCEPTION WHEN OTHERS THEN
    -- Логируем ошибку, но не прерываем транзакцию
    RAISE WARNING 'Failed to refresh materialized views: %', SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.atomic_refresh_inventory_views() OWNER TO neondb_owner;

--
-- Name: convert_document_type(text); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.convert_document_type(russian_type text) RETURNS public.document_type_enum
    LANGUAGE plpgsql
    AS $$
BEGIN
    CASE russian_type
        WHEN 'Оприходование' THEN RETURN 'income'::document_type_enum;
        WHEN 'Списание' THEN RETURN 'outcome'::document_type_enum;
        WHEN 'Возврат' THEN RETURN 'return'::document_type_enum;
        ELSE RETURN 'income'::document_type_enum; -- значение по умолчанию
    END CASE;
END;
$$;


ALTER FUNCTION public.convert_document_type(russian_type text) OWNER TO neondb_owner;

--
-- Name: refresh_inventory_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.refresh_inventory_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW inventory_summary;
  REFRESH MATERIALIZED VIEW inventory_availability;
END;
$$;


ALTER FUNCTION public.refresh_inventory_views() OWNER TO neondb_owner;

--
-- Name: refresh_materialized_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.refresh_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW inventory_summary;
  REFRESH MATERIALIZED VIEW inventory_availability;
END;
$$;


ALTER FUNCTION public.refresh_materialized_views() OWNER TO neondb_owner;

--
-- Name: trigger_refresh_inventory_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.trigger_refresh_inventory_views() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM refresh_inventory_views();
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION public.trigger_refresh_inventory_views() OWNER TO neondb_owner;

--
-- Name: trigger_refresh_materialized_views(); Type: FUNCTION; Schema: public; Owner: neondb_owner
--

CREATE FUNCTION public.trigger_refresh_materialized_views() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM refresh_materialized_views();
  RETURN NULL;
END;
$$;


ALTER FUNCTION public.trigger_refresh_materialized_views() OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: contractors; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contractors (
    id integer NOT NULL,
    name text NOT NULL,
    website text
);


ALTER TABLE public.contractors OWNER TO neondb_owner;

--
-- Name: contractors_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.contractors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contractors_id_seq OWNER TO neondb_owner;

--
-- Name: contractors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.contractors_id_seq OWNED BY public.contractors.id;


--
-- Name: document_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.document_items OWNER TO neondb_owner;

--
-- Name: document_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.document_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.document_items_id_seq OWNER TO neondb_owner;

--
-- Name: document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.document_items_id_seq OWNED BY public.document_items.id;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    warehouse_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now(),
    type public.document_type_enum DEFAULT 'income'::public.document_type_enum NOT NULL
);


ALTER TABLE public.documents OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.documents_id_seq OWNER TO neondb_owner;

--
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


--
-- Name: inventory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    document_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    movement_type text NOT NULL
);


ALTER TABLE public.inventory OWNER TO neondb_owner;

--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    sku character varying(100) NOT NULL,
    price numeric(10,2) NOT NULL,
    purchase_price numeric(10,2),
    barcode character varying(50),
    weight numeric(8,3),
    length numeric(8,1),
    width numeric(8,1),
    height numeric(8,1)
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: reserves; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reserves (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    warehouse_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reserves OWNER TO neondb_owner;

--
-- Name: inventory_availability; Type: MATERIALIZED VIEW; Schema: public; Owner: neondb_owner
--

CREATE MATERIALIZED VIEW public.inventory_availability AS
 SELECT p.id,
    p.name,
    d.warehouse_id,
    COALESCE(sum(
        CASE
            WHEN (d.type = 'income'::public.document_type_enum) THEN di.quantity
            ELSE (- di.quantity)
        END), (0)::numeric) AS quantity,
    COALESCE(sum(r.quantity), (0)::numeric) AS reserved,
    (COALESCE(sum(
        CASE
            WHEN (d.type = 'income'::public.document_type_enum) THEN di.quantity
            ELSE (- di.quantity)
        END), (0)::numeric) - COALESCE(sum(r.quantity), (0)::numeric)) AS available
   FROM (((public.products p
     LEFT JOIN public.document_items di ON ((p.id = di.product_id)))
     LEFT JOIN public.documents d ON (((di.document_id = d.id) AND (d.status = 'posted'::text))))
     LEFT JOIN public.reserves r ON (((p.id = r.product_id) AND (r.warehouse_id = d.warehouse_id))))
  GROUP BY p.id, p.name, d.warehouse_id
 HAVING ((COALESCE(sum(
        CASE
            WHEN (d.type = 'income'::public.document_type_enum) THEN di.quantity
            ELSE (- di.quantity)
        END), (0)::numeric) <> (0)::numeric) OR (COALESCE(sum(r.quantity), (0)::numeric) <> (0)::numeric))
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.inventory_availability OWNER TO neondb_owner;

--
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO neondb_owner;

--
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- Name: inventory_summary; Type: MATERIALIZED VIEW; Schema: public; Owner: neondb_owner
--

CREATE MATERIALIZED VIEW public.inventory_summary AS
 SELECT p.id,
    p.name,
    d.warehouse_id,
    sum(
        CASE
            WHEN (d.type = 'income'::public.document_type_enum) THEN di.quantity
            ELSE (- di.quantity)
        END) AS quantity
   FROM ((public.products p
     JOIN public.document_items di ON ((p.id = di.product_id)))
     JOIN public.documents d ON ((di.document_id = d.id)))
  WHERE (d.status = 'posted'::text)
  GROUP BY p.id, p.name, d.warehouse_id
 HAVING (sum(
        CASE
            WHEN (d.type = 'income'::public.document_type_enum) THEN di.quantity
            ELSE (- di.quantity)
        END) <> (0)::numeric)
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.inventory_summary OWNER TO neondb_owner;

--
-- Name: logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    level text NOT NULL,
    message text NOT NULL,
    module text NOT NULL,
    details text
);


ALTER TABLE public.logs OWNER TO neondb_owner;

--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_seq OWNER TO neondb_owner;

--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.order_items OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO neondb_owner;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'Новый'::text NOT NULL,
    customer_id integer,
    warehouse_id integer,
    total_amount numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    date text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_reserved boolean DEFAULT false NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO neondb_owner;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: reserves_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reserves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reserves_id_seq OWNER TO neondb_owner;

--
-- Name: reserves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reserves_id_seq OWNED BY public.reserves.id;


--
-- Name: shipment_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shipment_items (
    id integer NOT NULL,
    shipment_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    price numeric(10,2) DEFAULT '0'::numeric NOT NULL
);


ALTER TABLE public.shipment_items OWNER TO neondb_owner;

--
-- Name: shipment_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.shipment_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipment_items_id_seq OWNER TO neondb_owner;

--
-- Name: shipment_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.shipment_items_id_seq OWNED BY public.shipment_items.id;


--
-- Name: shipments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shipments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    date text NOT NULL,
    status public.shipment_status_enum DEFAULT 'draft'::public.shipment_status_enum NOT NULL,
    warehouse_id integer NOT NULL,
    responsible_user_id integer,
    comments text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shipments OWNER TO neondb_owner;

--
-- Name: shipments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.shipments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shipments_id_seq OWNER TO neondb_owner;

--
-- Name: shipments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.shipments_id_seq OWNED BY public.shipments.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name text NOT NULL,
    website text
);


ALTER TABLE public.suppliers OWNER TO neondb_owner;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO neondb_owner;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.warehouses (
    id integer NOT NULL,
    name text NOT NULL,
    address text
);


ALTER TABLE public.warehouses OWNER TO neondb_owner;

--
-- Name: warehouses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.warehouses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warehouses_id_seq OWNER TO neondb_owner;

--
-- Name: warehouses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.warehouses_id_seq OWNED BY public.warehouses.id;


--
-- Name: contractors id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contractors ALTER COLUMN id SET DEFAULT nextval('public.contractors_id_seq'::regclass);


--
-- Name: document_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_items ALTER COLUMN id SET DEFAULT nextval('public.document_items_id_seq'::regclass);


--
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: reserves id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reserves ALTER COLUMN id SET DEFAULT nextval('public.reserves_id_seq'::regclass);


--
-- Name: shipment_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipment_items ALTER COLUMN id SET DEFAULT nextval('public.shipment_items_id_seq'::regclass);


--
-- Name: shipments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments ALTER COLUMN id SET DEFAULT nextval('public.shipments_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warehouses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouses ALTER COLUMN id SET DEFAULT nextval('public.warehouses_id_seq'::regclass);


--
-- Data for Name: contractors; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.contractors (id, name, website) FROM stdin;
176	Клиент для отгрузки	https://test-client.com
177	Клиент для отгрузки	https://test-client.com
178	Клиент для отгрузки	https://test-client.com
179	Клиент для отгрузки	https://test-client.com
126	СтрессКонтрагент1	https://contractor1.com
127	СтрессКонтрагент2	https://contractor2.com
\.


--
-- Data for Name: document_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_items (id, document_id, product_id, quantity, price) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.documents (id, name, created_at, warehouse_id, status, updated_at, type) FROM stdin;
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory (id, product_id, quantity, price, document_id, created_at, movement_type) FROM stdin;
303	443	-1.000	1000.00	-56	2025-07-04 15:37:42.891	OUT
304	443	-4.000	0.00	-56	2025-07-04 15:37:42.959	OUT
305	443	5.000	100.00	-56	2025-07-04 15:37:43.337	IN
306	443	-1.000	1000.00	-57	2025-07-04 15:48:45.901	OUT
\.


--
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.logs (id, "timestamp", level, message, module, details) FROM stdin;
71749	2025-07-04 11:39:57.173676	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
71764	2025-07-04 11:40:01.645075	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
71771	2025-07-04 11:40:02.368881	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71775	2025-07-04 11:40:02.601026	INFO	Performance: getDocuments	database	{"duration":37}
71782	2025-07-04 11:40:03.437821	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629203416,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71809	2025-07-04 11:40:20.530414	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629220504,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71816	2025-07-04 11:40:21.109614	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
71821	2025-07-04 11:40:21.87091	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629221847,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71839	2025-07-04 11:40:22.491946	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71844	2025-07-04 11:40:25.637128	DEBUG	Starting: getDocuments	database	\N
71859	2025-07-04 11:40:26.158862	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
71862	2025-07-04 11:40:27.40827	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
71865	2025-07-04 11:40:27.574426	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71874	2025-07-04 11:40:39.812222	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71886	2025-07-04 11:40:42.261984	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73399	2025-07-04 12:06:48.054219	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73418	2025-07-04 12:07:15.145389	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630835125,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73431	2025-07-04 12:07:15.773767	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73438	2025-07-04 12:07:15.810092	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630835792,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73442	2025-07-04 12:07:17.254872	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73448	2025-07-04 12:07:19.354673	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73468	2025-07-04 12:07:20.571423	INFO	Performance: getDocuments	database	{"duration":71}
73471	2025-07-04 12:07:21.103415	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630841083,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73477	2025-07-04 12:07:21.94514	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73487	2025-07-04 12:07:22.467886	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73496	2025-07-04 12:07:23.774761	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73507	2025-07-04 12:07:23.814546	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630843795,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73509	2025-07-04 12:07:24.487011	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73512	2025-07-04 12:07:24.968	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73525	2025-07-04 12:07:27.18677	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73542	2025-07-04 12:07:28.762626	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73551	2025-07-04 12:07:31.069612	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73552	2025-07-04 12:07:35.129447	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
74601	2025-07-04 12:21:04.638277	INFO	Shipment items created	database	{"meta":{"shipmentId":23,"itemsCount":1}}
74603	2025-07-04 12:21:04.758999	INFO	Shipment updated	database	{"meta":{"shipmentId":23,"updatedFields":["status"],"status":"shipped"}}
74606	2025-07-04 12:21:04.846995	INFO	Shipment created	database	{"meta":{"shipmentId":24,"orderId":1,"status":"draft"}}
74611	2025-07-04 12:21:05.156995	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":24}}
74613	2025-07-04 12:21:05.232558	INFO	Shipment created	database	{"meta":{"shipmentId":25,"orderId":1,"status":"draft"}}
75204	2025-07-04 12:26:01.265349	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75224	2025-07-04 12:26:22.766531	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75228	2025-07-04 12:26:35.865279	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75243	2025-07-04 12:26:38.81235	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75257	2025-07-04 12:26:48.760786	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75262	2025-07-04 12:26:48.79922	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632008780,"responseTime":39,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75264	2025-07-04 12:26:50.006625	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75266	2025-07-04 12:26:50.083675	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":75}
75278	2025-07-04 12:26:50.591984	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75309	2025-07-04 12:26:51.708914	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75335	2025-07-04 12:26:55.324857	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":268}}
76556	2025-07-04 12:37:36.94076	DEBUG	Starting: getDocuments	database	\N
76561	2025-07-04 12:37:37.011737	DEBUG	Starting: getContractors	database	\N
76568	2025-07-04 12:37:37.224903	DEBUG	Starting: getShipments	database	\N
76578	2025-07-04 12:37:37.273731	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
76587	2025-07-04 12:37:37.348342	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"542ms","forced":false}}
76628	2025-07-04 12:37:42.623819	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
76645	2025-07-04 12:37:43.117605	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
76654	2025-07-04 12:37:43.153435	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
71750	2025-07-04 11:39:57.17476	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
71766	2025-07-04 11:40:01.645387	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
71770	2025-07-04 11:40:02.368689	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71772	2025-07-04 11:40:02.561574	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
71785	2025-07-04 11:40:03.443653	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
71789	2025-07-04 11:40:03.595421	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":155}
71795	2025-07-04 11:40:13.633552	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629213611,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71798	2025-07-04 11:40:13.785055	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
71807	2025-07-04 11:40:20.525069	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
71828	2025-07-04 11:40:21.928799	INFO	Performance: getDocuments	database	{"duration":45}
71840	2025-07-04 11:40:22.632858	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629222466,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
71843	2025-07-04 11:40:23.736434	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
71853	2025-07-04 11:40:25.677565	INFO	Performance: getDocuments	database	{"duration":45}
71858	2025-07-04 11:40:26.156485	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
71864	2025-07-04 11:40:27.409215	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71868	2025-07-04 11:40:27.649911	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":25105},"duration":74}
71870	2025-07-04 11:40:37.594435	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71875	2025-07-04 11:40:39.812532	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71888	2025-07-04 11:40:42.263851	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73400	2025-07-04 12:06:48.054543	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73416	2025-07-04 12:07:15.144677	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73428	2025-07-04 12:07:15.772861	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73437	2025-07-04 12:07:15.809465	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
73440	2025-07-04 12:07:17.254325	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630837233,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73449	2025-07-04 12:07:19.355294	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630839334,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73461	2025-07-04 12:07:20.498859	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73479	2025-07-04 12:07:21.952	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73486	2025-07-04 12:07:22.467699	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73505	2025-07-04 12:07:23.812742	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
73511	2025-07-04 12:07:24.967566	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73524	2025-07-04 12:07:27.186291	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73539	2025-07-04 12:07:28.762034	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74608	2025-07-04 12:21:05.04405	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":24,"itemsCount":1}}
74610	2025-07-04 12:21:05.118687	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":24}}
74614	2025-07-04 12:21:05.233307	INFO	Shipment created via service	app	{"meta":{"shipmentId":25,"orderId":1,"status":"draft"}}
75205	2025-07-04 12:26:01.265858	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631961243,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75222	2025-07-04 12:26:22.766149	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75230	2025-07-04 12:26:35.866064	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75244	2025-07-04 12:26:38.812525	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75261	2025-07-04 12:26:48.795917	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"35ms","rowCount":1}}
75279	2025-07-04 12:26:50.601484	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75310	2025-07-04 12:26:51.709152	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75336	2025-07-04 12:26:55.324983	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632015304,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76557	2025-07-04 12:37:36.972724	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76563	2025-07-04 12:37:37.013578	DEBUG	Starting: getInventory	database	{"meta":{}}
76569	2025-07-04 12:37:37.225161	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76579	2025-07-04 12:37:37.274038	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"518ms","forced":false}}
76588	2025-07-04 12:37:37.348671	INFO	Performance: getSuppliers	database	{"duration":540}
76627	2025-07-04 12:37:42.623609	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76641	2025-07-04 12:37:43.083561	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76646	2025-07-04 12:37:43.120738	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":46}
76658	2025-07-04 12:37:43.228115	INFO	Performance: getDocuments	database	{"duration":89}
76669	2025-07-04 12:37:43.459751	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76672	2025-07-04 12:37:43.50079	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
71751	2025-07-04 11:39:57.307132	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
71755	2025-07-04 11:39:58.037501	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":2253},"duration":37}
71757	2025-07-04 11:39:58.253751	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71759	2025-07-04 11:39:58.431286	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
71760	2025-07-04 11:39:58.543314	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
71762	2025-07-04 11:40:01.644449	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
71768	2025-07-04 11:40:02.368313	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629202346,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71773	2025-07-04 11:40:02.561848	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
71784	2025-07-04 11:40:03.442687	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71790	2025-07-04 11:40:03.600584	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":2}}
71792	2025-07-04 11:40:13.631925	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71799	2025-07-04 11:40:13.78592	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629213762,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
71803	2025-07-04 11:40:20.523501	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
71811	2025-07-04 11:40:20.56868	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
71815	2025-07-04 11:40:21.109348	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629221088,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
71819	2025-07-04 11:40:21.870259	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71835	2025-07-04 11:40:22.491004	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629222470,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71848	2025-07-04 11:40:25.638722	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629225615,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71880	2025-07-04 11:40:39.853684	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
71884	2025-07-04 11:40:42.253264	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73401	2025-07-04 12:06:48.055207	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73420	2025-07-04 12:07:15.146567	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73433	2025-07-04 12:07:15.774559	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73501	2025-07-04 12:07:23.776886	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73543	2025-07-04 12:07:28.763964	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630848742,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73548	2025-07-04 12:07:31.068862	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73553	2025-07-04 12:07:35.130514	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
74617	2025-07-04 12:21:05.435807	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":25}}
75206	2025-07-04 12:26:01.266097	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75223	2025-07-04 12:26:22.766341	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631982737,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75229	2025-07-04 12:26:35.865562	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75249	2025-07-04 12:26:38.849661	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
75252	2025-07-04 12:26:48.753956	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632008733,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75313	2025-07-04 12:26:51.710628	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75325	2025-07-04 12:26:53.91058	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632013889,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75337	2025-07-04 12:26:55.325157	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76558	2025-07-04 12:37:36.98516	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
76571	2025-07-04 12:37:37.225564	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76580	2025-07-04 12:37:37.275071	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76589	2025-07-04 12:37:37.348905	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
76598	2025-07-04 12:37:37.43099	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"963ms","forced":false}}
76600	2025-07-04 12:37:40.010586	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":7}
76629	2025-07-04 12:37:42.62411	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76639	2025-07-04 12:37:43.074803	INFO	Performance: PUT /shipments/56	api	{"meta":{"statusCode":200,"responseSize":181},"duration":442}
76650	2025-07-04 12:37:43.135092	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76683	2025-07-04 12:37:44.187534	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
76686	2025-07-04 12:37:45.472986	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76705	2025-07-04 12:37:48.725939	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77250	2025-07-04 12:45:37.290971	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633137268,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77269	2025-07-04 12:45:37.863259	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633137835,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77277	2025-07-04 12:45:38.407535	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77294	2025-07-04 12:45:51.174343	INFO	Performance: getDocuments	database	{"duration":74}
71752	2025-07-04 11:39:57.307845	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629197145,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
71765	2025-07-04 11:40:01.645213	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629201623,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
71769	2025-07-04 11:40:02.368473	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71776	2025-07-04 11:40:02.60143	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
71781	2025-07-04 11:40:03.437245	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71838	2025-07-04 11:40:22.491678	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71851	2025-07-04 11:40:25.639232	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71855	2025-07-04 11:40:25.678211	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":47}
71857	2025-07-04 11:40:26.155407	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629226134,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
71863	2025-07-04 11:40:27.408639	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71867	2025-07-04 11:40:27.615125	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":36}
71869	2025-07-04 11:40:37.593929	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71873	2025-07-04 11:40:39.811997	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71887	2025-07-04 11:40:42.263164	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":4}
73402	2025-07-04 12:06:48.055515	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630808031,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73419	2025-07-04 12:07:15.145584	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73432	2025-07-04 12:07:15.773901	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73466	2025-07-04 12:07:20.499853	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73470	2025-07-04 12:07:20.572945	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":74}
73472	2025-07-04 12:07:21.103761	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73482	2025-07-04 12:07:21.991287	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":43}
73488	2025-07-04 12:07:22.468019	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73493	2025-07-04 12:07:22.539952	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":75}
73497	2025-07-04 12:07:23.775115	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630843753,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73506	2025-07-04 12:07:23.81356	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
73508	2025-07-04 12:07:24.413003	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73510	2025-07-04 12:07:24.487371	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
73517	2025-07-04 12:07:25.042947	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73519	2025-07-04 12:07:26.662798	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/suppliers:{}","method":"GET","url":"/api/suppliers"}}
73526	2025-07-04 12:07:27.186934	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73538	2025-07-04 12:07:28.761535	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74622	2025-07-04 12:21:17.067399	INFO	Shipment updated	database	{"meta":{"shipmentId":26,"updatedFields":["status"],"status":"shipped"}}
74635	2025-07-04 12:21:17.794193	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":30}}
75207	2025-07-04 12:26:01.26638	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75218	2025-07-04 12:26:22.759194	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75232	2025-07-04 12:26:35.866395	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75239	2025-07-04 12:26:35.905153	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631995885,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75240	2025-07-04 12:26:38.811632	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75259	2025-07-04 12:26:48.761346	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75280	2025-07-04 12:26:50.601916	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632010580,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75311	2025-07-04 12:26:51.709415	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75327	2025-07-04 12:26:53.911005	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75333	2025-07-04 12:26:55.324493	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75346	2025-07-04 12:26:56.636756	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
76559	2025-07-04 12:37:37.006446	DEBUG	Starting: getWarehouses	database	\N
76570	2025-07-04 12:37:37.225398	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":791}}
76581	2025-07-04 12:37:37.275047	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76590	2025-07-04 12:37:37.349056	INFO	Performance: getProducts	database	{"duration":544}
76597	2025-07-04 12:37:37.430775	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":383,"duration":"962ms","forced":false}}
76607	2025-07-04 12:37:40.270041	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":996609},"duration":243}
76608	2025-07-04 12:37:42.050879	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
76613	2025-07-04 12:37:42.456666	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76623	2025-07-04 12:37:42.617062	INFO	Shipment items created	database	{"meta":{"shipmentId":56,"itemsCount":1}}
71753	2025-07-04 11:39:57.308374	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
71754	2025-07-04 11:39:58.000513	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71756	2025-07-04 11:39:58.253283	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":400},"duration":1}
71758	2025-07-04 11:39:58.431327	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":6}
71761	2025-07-04 11:39:58.58063	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
71763	2025-07-04 11:40:01.644853	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
71767	2025-07-04 11:40:02.367926	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71774	2025-07-04 11:40:02.561989	DEBUG	Starting: getDocuments	database	\N
71783	2025-07-04 11:40:03.442474	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
71791	2025-07-04 11:40:03.600507	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629203576,"responseTime":155,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
71794	2025-07-04 11:40:13.632515	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71800	2025-07-04 11:40:13.786228	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
71813	2025-07-04 11:40:20.569779	INFO	Performance: getDocuments	database	{"duration":45}
71814	2025-07-04 11:40:21.108893	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
71820	2025-07-04 11:40:21.870667	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71834	2025-07-04 11:40:22.490756	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71849	2025-07-04 11:40:25.638947	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71854	2025-07-04 11:40:25.677751	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
71860	2025-07-04 11:40:26.158818	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
71861	2025-07-04 11:40:27.407882	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":4}
71866	2025-07-04 11:40:27.578917	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
71872	2025-07-04 11:40:39.811431	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629239791,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73403	2025-07-04 12:06:48.05681	DEBUG	Starting: getDocuments	database	\N
73409	2025-07-04 12:06:48.126209	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":73}
73412	2025-07-04 12:07:14.250765	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73421	2025-07-04 12:07:15.147487	DEBUG	Starting: getDocuments	database	\N
73425	2025-07-04 12:07:15.229677	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":89}
73429	2025-07-04 12:07:15.773429	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73464	2025-07-04 12:07:20.499361	DEBUG	Starting: getDocuments	database	\N
73469	2025-07-04 12:07:20.572228	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73473	2025-07-04 12:07:21.105813	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73483	2025-07-04 12:07:22.143225	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":355647},"duration":192}
73492	2025-07-04 12:07:22.539542	INFO	Performance: getDocuments	database	{"duration":73}
73499	2025-07-04 12:07:23.77569	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73540	2025-07-04 12:07:28.762301	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74623	2025-07-04 12:21:17.156821	INFO	Shipment created	database	{"meta":{"shipmentId":26,"orderId":1,"status":"draft"}}
74625	2025-07-04 12:21:17.277507	INFO	Shipment created	database	{"meta":{"shipmentId":27,"orderId":2,"status":"draft"}}
74627	2025-07-04 12:21:17.360664	INFO	Shipment created	database	{"meta":{"shipmentId":28,"orderId":1,"status":"draft"}}
74629	2025-07-04 12:21:17.447601	INFO	Shipment created	database	{"meta":{"shipmentId":30,"orderId":3,"status":"draft"}}
74631	2025-07-04 12:21:17.601497	INFO	Shipment deleted	database	{"meta":{"shipmentId":29}}
74633	2025-07-04 12:21:17.719761	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":28}}
75208	2025-07-04 12:26:01.266721	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75216	2025-07-04 12:26:22.758083	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75226	2025-07-04 12:26:22.796541	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":43}
75231	2025-07-04 12:26:35.866259	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75238	2025-07-04 12:26:35.90526	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":43}
75242	2025-07-04 12:26:38.812132	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75258	2025-07-04 12:26:48.761418	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75263	2025-07-04 12:26:48.799916	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
75267	2025-07-04 12:26:50.084027	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75284	2025-07-04 12:26:50.666859	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75299	2025-07-04 12:26:51.156827	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75301	2025-07-04 12:26:51.233501	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
75312	2025-07-04 12:26:51.709616	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75328	2025-07-04 12:26:53.911158	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75334	2025-07-04 12:26:55.324698	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632015300,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75348	2025-07-04 12:26:56.637101	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76560	2025-07-04 12:37:37.007698	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
76573	2025-07-04 12:37:37.226036	DEBUG	Starting: getProducts	database	\N
76583	2025-07-04 12:37:37.275642	INFO	Performance: getInventory	database	{"meta":{},"duration":532}
71777	2025-07-04 11:40:02.732283	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
71779	2025-07-04 11:40:03.436515	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71805	2025-07-04 11:40:20.524664	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
71826	2025-07-04 11:40:21.872885	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
71833	2025-07-04 11:40:22.489952	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
71850	2025-07-04 11:40:25.639079	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71878	2025-07-04 11:40:39.816582	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
71889	2025-07-04 11:40:42.298769	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":44}
71914	2025-07-04 11:40:52.446036	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
73404	2025-07-04 12:06:48.057074	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73408	2025-07-04 12:06:48.126004	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73413	2025-07-04 12:07:14.25094	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630834230,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73422	2025-07-04 12:07:15.147698	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73424	2025-07-04 12:07:15.229356	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73430	2025-07-04 12:07:15.773587	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630835749,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73451	2025-07-04 12:07:19.355782	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73465	2025-07-04 12:07:20.499488	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73467	2025-07-04 12:07:20.571082	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73474	2025-07-04 12:07:21.106091	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73476	2025-07-04 12:07:21.942937	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
73485	2025-07-04 12:07:22.467536	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630842448,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73500	2025-07-04 12:07:23.775927	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73513	2025-07-04 12:07:24.968924	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73520	2025-07-04 12:07:26.663672	INFO	Performance: GET /suppliers	api	{"meta":{"statusCode":200,"responseSize":139},"duration":2}
73527	2025-07-04 12:07:27.18767	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630847166,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73535	2025-07-04 12:07:28.757942	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74624	2025-07-04 12:21:17.231775	INFO	Shipment updated	database	{"meta":{"shipmentId":26,"updatedFields":["status"],"status":"delivered"}}
74626	2025-07-04 12:21:17.320227	INFO	Shipment updated	database	{"meta":{"shipmentId":27,"updatedFields":["status"],"status":"cancelled"}}
74628	2025-07-04 12:21:17.406262	INFO	Shipment created	database	{"meta":{"shipmentId":29,"orderId":2,"status":"draft"}}
74630	2025-07-04 12:21:17.524579	INFO	Shipment deleted	database	{"meta":{"shipmentId":28}}
74632	2025-07-04 12:21:17.677972	INFO	Shipment deleted	database	{"meta":{"shipmentId":30}}
74634	2025-07-04 12:21:17.757489	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":29}}
75209	2025-07-04 12:26:01.267232	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75221	2025-07-04 12:26:22.760261	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75235	2025-07-04 12:26:35.867629	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75245	2025-07-04 12:26:38.813117	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75260	2025-07-04 12:26:48.762326	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75281	2025-07-04 12:26:50.603136	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75315	2025-07-04 12:26:51.711086	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75320	2025-07-04 12:26:51.753896	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632011733,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75323	2025-07-04 12:26:53.301592	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75330	2025-07-04 12:26:53.978548	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75339	2025-07-04 12:26:55.325692	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75349	2025-07-04 12:26:56.637996	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632016616,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76562	2025-07-04 12:37:37.012352	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
76572	2025-07-04 12:37:37.225777	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76582	2025-07-04 12:37:37.275395	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"538ms","forced":false}}
76596	2025-07-04 12:37:37.429395	INFO	Performance: getShipments	database	{"duration":931}
76602	2025-07-04 12:37:40.014641	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76621	2025-07-04 12:37:42.531864	INFO	POST /shipments	api	{"meta":{"method":"POST","url":"/shipments","bodySize":121}}
76622	2025-07-04 12:37:42.617126	INFO	Shipment created	database	{"meta":{"shipmentId":56,"orderId":1,"status":"draft"}}
76638	2025-07-04 12:37:43.074603	INFO	Shipment updated via service	app	{"meta":{"shipmentId":56,"updatedFields":["status"],"status":"shipped"}}
76647	2025-07-04 12:37:43.122751	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
76662	2025-07-04 12:37:43.287863	DEBUG	Starting: getDocuments	database	\N
71778	2025-07-04 11:40:02.748217	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
71780	2025-07-04 11:40:03.436991	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71808	2025-07-04 11:40:20.525288	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71810	2025-07-04 11:40:20.567443	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
71817	2025-07-04 11:40:21.110155	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
71822	2025-07-04 11:40:21.871058	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71829	2025-07-04 11:40:21.928993	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":47}
71832	2025-07-04 11:40:22.489742	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
71845	2025-07-04 11:40:25.637928	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71876	2025-07-04 11:40:39.813483	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
71879	2025-07-04 11:40:39.852897	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
71890	2025-07-04 11:40:42.328203	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":28953},"duration":74}
71913	2025-07-04 11:40:52.446117	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73405	2025-07-04 12:06:48.057255	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73415	2025-07-04 12:07:14.252064	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73423	2025-07-04 12:07:15.148102	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73426	2025-07-04 12:07:15.231821	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73435	2025-07-04 12:07:15.778858	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73453	2025-07-04 12:07:19.356986	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73454	2025-07-04 12:07:19.430004	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":78}
73456	2025-07-04 12:07:19.95063	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73457	2025-07-04 12:07:20.031571	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":83}
73459	2025-07-04 12:07:20.497322	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73489	2025-07-04 12:07:22.468487	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73504	2025-07-04 12:07:23.779366	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73514	2025-07-04 12:07:24.969417	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73523	2025-07-04 12:07:26.664604	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/suppliers:{}","dataSize":139}}
73529	2025-07-04 12:07:27.189473	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73544	2025-07-04 12:07:28.798041	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
73547	2025-07-04 12:07:31.068513	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630851047,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73556	2025-07-04 12:07:35.131373	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
74640	2025-07-04 12:21:20.075279	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74650	2025-07-04 12:21:26.289993	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74661	2025-07-04 12:21:31.173538	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":597247},"duration":219}
74663	2025-07-04 12:21:41.226961	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74664	2025-07-04 12:21:48.33759	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
74670	2025-07-04 12:21:48.917088	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74689	2025-07-04 12:21:49.796737	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
74697	2025-07-04 12:21:54.067329	DEBUG	Starting: getShipments	database	\N
74732	2025-07-04 12:21:57.492694	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74757	2025-07-04 12:22:10.902418	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74759	2025-07-04 12:22:10.940985	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
74767	2025-07-04 12:22:14.384384	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74784	2025-07-04 12:22:15.756621	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"43ms","rowCount":1}}
74790	2025-07-04 12:22:16.347328	DEBUG	Starting: getDocuments	database	\N
74797	2025-07-04 12:22:16.420113	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":80}
74801	2025-07-04 12:22:16.972812	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75210	2025-07-04 12:26:01.267485	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75217	2025-07-04 12:26:22.759002	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75236	2025-07-04 12:26:35.867807	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75246	2025-07-04 12:26:38.81341	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75256	2025-07-04 12:26:48.75573	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75283	2025-07-04 12:26:50.60354	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75316	2025-07-04 12:26:51.711237	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632011686,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75319	2025-07-04 12:26:51.753217	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":268},"duration":43}
75321	2025-07-04 12:26:53.225226	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75322	2025-07-04 12:26:53.301695	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
71786	2025-07-04 11:40:03.557102	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
71804	2025-07-04 11:40:20.524115	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71825	2025-07-04 11:40:21.872922	DEBUG	Starting: getDocuments	database	\N
71836	2025-07-04 11:40:22.491201	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71841	2025-07-04 11:40:23.696555	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
71842	2025-07-04 11:40:23.735074	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
71846	2025-07-04 11:40:25.63827	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
71877	2025-07-04 11:40:39.815317	INFO	Получение всех отгрузок	app	{"meta":{}}
71882	2025-07-04 11:40:39.854257	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":37}
71883	2025-07-04 11:40:42.25225	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73406	2025-07-04 12:06:48.05767	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73410	2025-07-04 12:06:48.126781	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73414	2025-07-04 12:07:14.251928	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73427	2025-07-04 12:07:15.232204	INFO	Performance: getDocuments	database	{"duration":87}
73434	2025-07-04 12:07:15.778508	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73444	2025-07-04 12:07:17.257834	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73447	2025-07-04 12:07:18.411981	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73452	2025-07-04 12:07:19.356062	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73463	2025-07-04 12:07:20.499192	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630840476,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73481	2025-07-04 12:07:21.953823	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73490	2025-07-04 12:07:22.468768	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73494	2025-07-04 12:07:22.541141	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73503	2025-07-04 12:07:23.77797	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73515	2025-07-04 12:07:24.969715	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630844949,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73518	2025-07-04 12:07:25.04439	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":78}
73521	2025-07-04 12:07:26.663963	INFO	GET /suppliers	api	{"meta":{"method":"GET","url":"/suppliers","bodySize":2}}
73528	2025-07-04 12:07:27.188126	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73530	2025-07-04 12:07:27.268673	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":82}
73532	2025-07-04 12:07:28.14158	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73534	2025-07-04 12:07:28.221992	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":81}
73536	2025-07-04 12:07:28.759694	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73545	2025-07-04 12:07:28.798657	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630848779,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73550	2025-07-04 12:07:31.069351	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73555	2025-07-04 12:07:35.130952	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630855107,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
74641	2025-07-04 12:21:20.077261	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74652	2025-07-04 12:21:26.325174	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
74654	2025-07-04 12:21:30.945103	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
74673	2025-07-04 12:21:48.92081	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631708900,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74676	2025-07-04 12:21:48.995085	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74681	2025-07-04 12:21:49.759589	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74701	2025-07-04 12:21:54.072893	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631714051,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74731	2025-07-04 12:21:57.492317	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74755	2025-07-04 12:22:10.899642	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74760	2025-07-04 12:22:10.942166	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631730922,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74762	2025-07-04 12:22:13.632613	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74764	2025-07-04 12:22:14.382585	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74777	2025-07-04 12:22:15.720027	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74785	2025-07-04 12:22:15.759766	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631735740,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74787	2025-07-04 12:22:16.346227	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74808	2025-07-04 12:22:17.009167	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
74817	2025-07-04 12:22:18.100408	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631738079,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74824	2025-07-04 12:22:21.469169	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
75211	2025-07-04 12:26:01.26778	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75214	2025-07-04 12:26:01.308373	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631961289,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76564	2025-07-04 12:37:37.013783	DEBUG	Starting: getSuppliers	database	\N
71787	2025-07-04 11:40:03.562927	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
71796	2025-07-04 11:40:13.633777	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
71801	2025-07-04 11:40:13.786133	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
71806	2025-07-04 11:40:20.524906	DEBUG	Starting: getDocuments	database	\N
71812	2025-07-04 11:40:20.569037	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":47}
71818	2025-07-04 11:40:21.110921	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
71823	2025-07-04 11:40:21.871645	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71830	2025-07-04 11:40:21.928939	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
71837	2025-07-04 11:40:22.491389	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
71847	2025-07-04 11:40:25.638171	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
71881	2025-07-04 11:40:39.853851	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
71885	2025-07-04 11:40:42.253484	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":2}
73407	2025-07-04 12:06:48.124904	INFO	Performance: getDocuments	database	{"duration":71}
73411	2025-07-04 12:07:14.250036	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73417	2025-07-04 12:07:15.145094	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73436	2025-07-04 12:07:15.808314	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
73441	2025-07-04 12:07:17.254685	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73450	2025-07-04 12:07:19.355487	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73460	2025-07-04 12:07:20.498592	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73480	2025-07-04 12:07:21.95355	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
73484	2025-07-04 12:07:22.466834	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73498	2025-07-04 12:07:23.775256	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73541	2025-07-04 12:07:28.762243	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74642	2025-07-04 12:21:20.086049	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
74647	2025-07-04 12:21:26.287701	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
74660	2025-07-04 12:21:30.986359	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
74662	2025-07-04 12:21:41.226505	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74666	2025-07-04 12:21:48.337477	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
74669	2025-07-04 12:21:48.916685	DEBUG	Starting: getDocuments	database	\N
74684	2025-07-04 12:21:49.760242	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74690	2025-07-04 12:21:49.800237	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
74693	2025-07-04 12:21:50.697876	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74695	2025-07-04 12:21:50.770037	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":72}
74704	2025-07-04 12:21:54.102134	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74708	2025-07-04 12:21:54.145467	INFO	Retrieved all shipments	app	{"meta":{"count":6,"entity":"Shipment"}}
74730	2025-07-04 12:21:57.492173	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631717469,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74758	2025-07-04 12:22:10.94076	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
74761	2025-07-04 12:22:13.560093	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74763	2025-07-04 12:22:13.632992	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
74770	2025-07-04 12:22:14.457935	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74773	2025-07-04 12:22:15.144218	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74775	2025-07-04 12:22:15.712505	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74802	2025-07-04 12:22:16.972989	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74821	2025-07-04 12:22:18.175521	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74822	2025-07-04 12:22:21.46771	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75212	2025-07-04 12:26:01.268042	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75215	2025-07-04 12:26:01.308581	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
75220	2025-07-04 12:26:22.759556	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75227	2025-07-04 12:26:22.797643	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631982778,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75233	2025-07-04 12:26:35.866988	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75247	2025-07-04 12:26:38.813953	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75250	2025-07-04 12:26:38.853403	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
75255	2025-07-04 12:26:48.755522	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75282	2025-07-04 12:26:50.603369	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75285	2025-07-04 12:26:50.667788	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":74}
75302	2025-07-04 12:26:51.233782	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75308	2025-07-04 12:26:51.707897	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75341	2025-07-04 12:26:55.326351	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":268},"duration":1}
71788	2025-07-04 11:40:03.593786	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"151ms","rowCount":0}}
71793	2025-07-04 11:40:13.632358	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
71797	2025-07-04 11:40:13.78351	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":2}}
71802	2025-07-04 11:40:20.52306	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
71824	2025-07-04 11:40:21.872434	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
71827	2025-07-04 11:40:21.927183	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
71831	2025-07-04 11:40:22.489245	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":2}}
71852	2025-07-04 11:40:25.676269	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
71856	2025-07-04 11:40:26.154827	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
71871	2025-07-04 11:40:39.811031	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73439	2025-07-04 12:07:15.90249	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73443	2025-07-04 12:07:17.257627	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73445	2025-07-04 12:07:18.333815	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73446	2025-07-04 12:07:18.411659	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":81}
73455	2025-07-04 12:07:19.430622	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73458	2025-07-04 12:07:20.031987	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73462	2025-07-04 12:07:20.499045	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73475	2025-07-04 12:07:21.113731	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73478	2025-07-04 12:07:21.951805	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73491	2025-07-04 12:07:22.469006	DEBUG	Starting: getDocuments	database	\N
73495	2025-07-04 12:07:22.541318	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73502	2025-07-04 12:07:23.777516	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73516	2025-07-04 12:07:24.969943	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73522	2025-07-04 12:07:26.664125	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630846642,"responseTime":0,"endpoint":"/api/suppliers","cacheHit":true,"dbQueries":0}}
73531	2025-07-04 12:07:27.269016	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73533	2025-07-04 12:07:28.221624	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73537	2025-07-04 12:07:28.759888	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73546	2025-07-04 12:07:28.798884	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
73549	2025-07-04 12:07:31.069155	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73554	2025-07-04 12:07:35.130979	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
74643	2025-07-04 12:21:20.091273	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74649	2025-07-04 12:21:26.288405	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74658	2025-07-04 12:21:30.950714	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74668	2025-07-04 12:21:48.339759	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
74679	2025-07-04 12:21:48.99608	INFO	Performance: getDocuments	database	{"duration":77}
74686	2025-07-04 12:21:49.7613	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74691	2025-07-04 12:21:49.800925	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631709781,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74699	2025-07-04 12:21:54.067858	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
74707	2025-07-04 12:21:54.14525	INFO	Performance: getShipments	database	{"duration":82}
74736	2025-07-04 12:21:57.494392	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74748	2025-07-04 12:21:59.106673	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74751	2025-07-04 12:22:10.897819	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74769	2025-07-04 12:22:14.385261	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631734363,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74781	2025-07-04 12:22:15.722042	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74792	2025-07-04 12:22:16.347765	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74806	2025-07-04 12:22:16.973658	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74818	2025-07-04 12:22:18.100553	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74826	2025-07-04 12:22:21.470532	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631741443,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74828	2025-07-04 12:22:21.546151	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
75213	2025-07-04 12:26:01.305742	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
75225	2025-07-04 12:26:22.795691	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
75237	2025-07-04 12:26:35.901488	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
75241	2025-07-04 12:26:38.811982	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631998790,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75253	2025-07-04 12:26:48.754532	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75314	2025-07-04 12:26:51.710857	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75317	2025-07-04 12:26:51.752628	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":268}}
75326	2025-07-04 12:26:53.91083	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71891	2025-07-04 11:40:50.118087	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
71895	2025-07-04 11:40:50.145493	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"143ms","forced":false}}
71903	2025-07-04 11:40:50.167615	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73557	2025-07-04 12:07:45.854046	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73562	2025-07-04 12:07:53.918721	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73567	2025-07-04 12:08:06.7527	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73572	2025-07-04 12:08:11.055772	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73577	2025-07-04 12:08:13.071241	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73582	2025-07-04 12:08:20.367485	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73587	2025-07-04 12:08:32.487697	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73592	2025-07-04 12:08:35.706596	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73597	2025-07-04 12:08:40.077029	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73602	2025-07-04 12:08:47.434908	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73637	2025-07-04 12:08:49.355582	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73649	2025-07-04 12:08:50.948461	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630930926,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73654	2025-07-04 12:08:55.780478	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73665	2025-07-04 12:09:12.574543	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73670	2025-07-04 12:09:14.140018	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73680	2025-07-04 12:09:15.874116	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73687	2025-07-04 12:09:17.814492	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73697	2025-07-04 12:09:22.366945	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73703	2025-07-04 12:09:22.957085	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73709	2025-07-04 12:09:23.580094	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73739	2025-07-04 12:09:25.565665	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73742	2025-07-04 12:09:25.64065	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630965621,"responseTime":79,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73745	2025-07-04 12:09:26.194893	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630966174,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73755	2025-07-04 12:09:26.74246	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74644	2025-07-04 12:21:20.126432	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":164}
74646	2025-07-04 12:21:26.286454	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74659	2025-07-04 12:21:30.950894	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74665	2025-07-04 12:21:48.337852	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631708318,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
74672	2025-07-04 12:21:48.920875	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74678	2025-07-04 12:21:48.995681	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":79}
74682	2025-07-04 12:21:49.759933	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631709735,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74698	2025-07-04 12:21:54.067584	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74733	2025-07-04 12:21:57.492642	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74739	2025-07-04 12:21:57.532814	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631717513,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74741	2025-07-04 12:21:58.653863	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74742	2025-07-04 12:21:58.729694	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
74744	2025-07-04 12:21:59.105056	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74752	2025-07-04 12:22:10.897958	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74783	2025-07-04 12:22:15.723617	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":3}
74789	2025-07-04 12:22:16.347175	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74803	2025-07-04 12:22:16.973204	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74815	2025-07-04 12:22:18.100174	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74820	2025-07-04 12:22:18.174877	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
74823	2025-07-04 12:22:21.468081	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75219	2025-07-04 12:26:22.75895	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75234	2025-07-04 12:26:35.867466	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631995845,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75248	2025-07-04 12:26:38.814211	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75251	2025-07-04 12:26:38.853626	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631998834,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75254	2025-07-04 12:26:48.75537	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71892	2025-07-04 11:40:50.123684	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":43}}
71898	2025-07-04 11:40:50.149258	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
71906	2025-07-04 11:40:50.17232	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":163,"duration":"162ms","forced":false}}
73558	2025-07-04 12:07:45.854938	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630865833,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73564	2025-07-04 12:07:53.920498	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73568	2025-07-04 12:08:06.754055	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73575	2025-07-04 12:08:11.058125	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73580	2025-07-04 12:08:13.073254	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630893051,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73583	2025-07-04 12:08:20.367916	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630900346,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73589	2025-07-04 12:08:32.488764	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":3}
73595	2025-07-04 12:08:35.73172	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630915684,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73599	2025-07-04 12:08:40.079755	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630920055,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73606	2025-07-04 12:08:47.473712	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
73618	2025-07-04 12:08:48.171437	DEBUG	Starting: getDocuments	database	\N
73640	2025-07-04 12:08:49.394353	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
73648	2025-07-04 12:08:50.94821	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73658	2025-07-04 12:08:55.783914	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73664	2025-07-04 12:09:12.574191	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73673	2025-07-04 12:09:14.141113	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73682	2025-07-04 12:09:15.875514	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73690	2025-07-04 12:09:17.815389	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73698	2025-07-04 12:09:22.369086	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73705	2025-07-04 12:09:22.957703	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73712	2025-07-04 12:09:23.581924	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73726	2025-07-04 12:09:24.62283	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73744	2025-07-04 12:09:25.663653	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"75ms","rowCount":1}}
73748	2025-07-04 12:09:26.198588	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73750	2025-07-04 12:09:26.718885	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":699},"duration":0}
74645	2025-07-04 12:21:20.323118	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":594875},"duration":358}
74648	2025-07-04 12:21:26.287896	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74657	2025-07-04 12:21:30.95048	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74667	2025-07-04 12:21:48.338798	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
74671	2025-07-04 12:21:48.918011	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74687	2025-07-04 12:21:49.761478	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74711	2025-07-04 12:21:54.149522	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74727	2025-07-04 12:21:56.635677	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74735	2025-07-04 12:21:57.494156	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74740	2025-07-04 12:21:57.534003	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
74743	2025-07-04 12:21:58.730812	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74747	2025-07-04 12:21:59.106169	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74753	2025-07-04 12:22:10.898129	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74782	2025-07-04 12:22:15.722249	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631735697,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74793	2025-07-04 12:22:16.348008	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74798	2025-07-04 12:22:16.421015	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74807	2025-07-04 12:22:16.97387	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74810	2025-07-04 12:22:17.014214	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
74812	2025-07-04 12:22:17.64766	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74819	2025-07-04 12:22:18.10099	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74827	2025-07-04 12:22:21.471004	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
75265	2025-07-04 12:26:50.061196	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":10}}
76565	2025-07-04 12:37:37.014183	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
76576	2025-07-04 12:37:37.227052	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"506ms","forced":false}}
76585	2025-07-04 12:37:37.326821	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"539ms","forced":false}}
71893	2025-07-04 11:40:50.134372	INFO	Performance: getContractors	database	{"duration":131}
71899	2025-07-04 11:40:50.153864	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":163,"duration":"147ms","forced":false}}
71907	2025-07-04 11:40:50.172776	INFO	Performance: getWarehouses	database	{"duration":163}
73559	2025-07-04 12:07:45.855492	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73566	2025-07-04 12:07:53.928527	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73571	2025-07-04 12:08:06.754799	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73574	2025-07-04 12:08:11.057909	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73579	2025-07-04 12:08:13.073024	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73585	2025-07-04 12:08:20.36864	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73588	2025-07-04 12:08:32.488123	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73596	2025-07-04 12:08:35.731892	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73601	2025-07-04 12:08:40.08004	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73604	2025-07-04 12:08:47.43676	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73607	2025-07-04 12:08:47.478199	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":48}
73623	2025-07-04 12:08:48.26325	INFO	Performance: getDocuments	database	{"duration":90}
73629	2025-07-04 12:08:48.785283	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73639	2025-07-04 12:08:49.35686	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73651	2025-07-04 12:08:50.949494	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73653	2025-07-04 12:08:51.0322	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":80}
73659	2025-07-04 12:08:55.784084	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73661	2025-07-04 12:08:55.862366	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73669	2025-07-04 12:09:12.659099	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73677	2025-07-04 12:09:14.225192	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73685	2025-07-04 12:09:15.959568	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73692	2025-07-04 12:09:17.89197	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73695	2025-07-04 12:09:22.360586	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73713	2025-07-04 12:09:23.5821	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73729	2025-07-04 12:09:24.702276	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73732	2025-07-04 12:09:25.229199	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73741	2025-07-04 12:09:25.583666	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73749	2025-07-04 12:09:26.19905	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73751	2025-07-04 12:09:26.71971	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74680	2025-07-04 12:21:49.035095	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74683	2025-07-04 12:21:49.760112	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74700	2025-07-04 12:21:54.072926	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74738	2025-07-04 12:21:57.531461	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
74745	2025-07-04 12:21:59.105417	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631719084,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74750	2025-07-04 12:22:10.896815	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74766	2025-07-04 12:22:14.384175	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74779	2025-07-04 12:22:15.721359	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74786	2025-07-04 12:22:15.762283	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":47}
74796	2025-07-04 12:22:16.418567	INFO	Performance: getDocuments	database	{"duration":78}
74799	2025-07-04 12:22:16.971752	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
75268	2025-07-04 12:26:50.086298	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":10}}
75291	2025-07-04 12:26:50.889507	INFO	Shipment created	database	{"meta":{"shipmentId":49,"orderId":1,"status":"draft"}}
75293	2025-07-04 12:26:50.964806	INFO	Shipment updated	database	{"meta":{"shipmentId":49,"updatedFields":["status"],"status":"delivered"}}
75295	2025-07-04 12:26:51.041142	INFO	Shipment updated	database	{"meta":{"shipmentId":50,"updatedFields":["status"],"status":"cancelled"}}
75297	2025-07-04 12:26:51.115895	INFO	Shipment created	database	{"meta":{"shipmentId":52,"orderId":2,"status":"draft"}}
75300	2025-07-04 12:26:51.224356	INFO	Shipment deleted	database	{"meta":{"shipmentId":51}}
75304	2025-07-04 12:26:51.37036	INFO	Shipment deleted	database	{"meta":{"shipmentId":53}}
75306	2025-07-04 12:26:51.445711	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":52}}
76566	2025-07-04 12:37:37.014647	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76575	2025-07-04 12:37:37.227152	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76584	2025-07-04 12:37:37.275947	INFO	Performance: getContractors	database	{"duration":537}
76592	2025-07-04 12:37:37.350506	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"544ms","forced":false}}
76605	2025-07-04 12:37:40.018794	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76610	2025-07-04 12:37:42.05274	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632662030,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
71894	2025-07-04 11:40:50.141433	INFO	Performance: getProducts	database	{"duration":142}
71902	2025-07-04 11:40:50.16506	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"149ms","forced":false}}
71910	2025-07-04 11:40:50.187055	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"167ms","forced":false}}
73560	2025-07-04 12:07:45.85589	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73565	2025-07-04 12:07:53.920686	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630873897,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73569	2025-07-04 12:08:06.754475	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630886732,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73576	2025-07-04 12:08:11.058265	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73581	2025-07-04 12:08:13.073209	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73584	2025-07-04 12:08:20.368397	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73591	2025-07-04 12:08:32.489341	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73594	2025-07-04 12:08:35.730013	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73600	2025-07-04 12:08:40.07992	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73605	2025-07-04 12:08:47.43692	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73608	2025-07-04 12:08:47.478396	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630927456,"responseTime":48,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73620	2025-07-04 12:08:48.171995	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73625	2025-07-04 12:08:48.264621	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":91}
73628	2025-07-04 12:08:48.785146	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73632	2025-07-04 12:08:49.353324	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630929332,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74692	2025-07-04 12:21:49.869836	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74694	2025-07-04 12:21:50.769513	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74696	2025-07-04 12:21:54.066505	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
74705	2025-07-04 12:21:54.103173	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74706	2025-07-04 12:21:54.143818	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":6}}
74729	2025-07-04 12:21:57.491817	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74754	2025-07-04 12:22:10.899466	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74765	2025-07-04 12:22:14.383799	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74776	2025-07-04 12:22:15.719628	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74788	2025-07-04 12:22:16.346954	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74800	2025-07-04 12:22:16.972107	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74816	2025-07-04 12:22:18.100297	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74825	2025-07-04 12:22:21.470321	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75269	2025-07-04 12:26:50.090912	INFO	Performance: getInventory	database	{"meta":{},"duration":39}
75290	2025-07-04 12:26:50.852537	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
75294	2025-07-04 12:26:51.004301	INFO	Shipment created	database	{"meta":{"shipmentId":50,"orderId":2,"status":"draft"}}
75298	2025-07-04 12:26:51.154398	INFO	Shipment created	database	{"meta":{"shipmentId":53,"orderId":3,"status":"draft"}}
75303	2025-07-04 12:26:51.298345	INFO	Shipment deleted	database	{"meta":{"shipmentId":52}}
75305	2025-07-04 12:26:51.40908	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":51}}
76567	2025-07-04 12:37:37.015119	DEBUG	Starting: getInventory	database	{"meta":{}}
76577	2025-07-04 12:37:37.227897	INFO	Performance: getWarehouses	database	{"duration":516}
76593	2025-07-04 12:37:37.375161	INFO	Performance: getDocuments	database	{"duration":875}
76606	2025-07-04 12:37:40.059344	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":41}
76612	2025-07-04 12:37:42.053104	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
76616	2025-07-04 12:37:42.459116	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76619	2025-07-04 12:37:42.499133	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":42}
76625	2025-07-04 12:37:42.619371	INFO	Shipment created	app	{"meta":{"shipmentId":56,"orderId":1}}
76644	2025-07-04 12:37:43.085405	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76667	2025-07-04 12:37:43.458212	INFO	Shipment updated via service	app	{"meta":{"shipmentId":56,"updatedFields":["status"],"status":"draft"}}
76685	2025-07-04 12:37:44.188942	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76697	2025-07-04 12:37:45.554069	INFO	Performance: getDocuments	database	{"duration":80}
76700	2025-07-04 12:37:46.966218	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76709	2025-07-04 12:37:48.761256	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76716	2025-07-04 12:37:48.802387	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
76721	2025-07-04 12:38:14.180379	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76730	2025-07-04 12:38:26.249197	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76737	2025-07-04 12:38:33.20867	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632713186,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77251	2025-07-04 12:45:37.291439	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
71896	2025-07-04 11:40:50.146945	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
71904	2025-07-04 11:40:50.168334	INFO	Performance: getInventory	database	{"meta":{},"duration":159}
73561	2025-07-04 12:07:45.85688	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73563	2025-07-04 12:07:53.920051	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73570	2025-07-04 12:08:06.754396	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73573	2025-07-04 12:08:11.057043	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630891035,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73578	2025-07-04 12:08:13.072641	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73586	2025-07-04 12:08:20.368858	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73590	2025-07-04 12:08:32.48907	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630912465,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73593	2025-07-04 12:08:35.707785	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73598	2025-07-04 12:08:40.078234	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73603	2025-07-04 12:08:47.436206	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73619	2025-07-04 12:08:48.171815	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73638	2025-07-04 12:08:49.356647	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73641	2025-07-04 12:08:49.394867	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
73643	2025-07-04 12:08:49.863784	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73644	2025-07-04 12:08:49.944121	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73646	2025-07-04 12:08:50.943663	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73656	2025-07-04 12:08:55.781882	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73666	2025-07-04 12:09:12.57471	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630952553,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73675	2025-07-04 12:09:14.141948	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73676	2025-07-04 12:09:14.222196	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":85}
73681	2025-07-04 12:09:15.874987	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73684	2025-07-04 12:09:15.955309	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":82}
73689	2025-07-04 12:09:17.815031	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73701	2025-07-04 12:09:22.568201	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":401014},"duration":200}
73706	2025-07-04 12:09:22.957916	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73710	2025-07-04 12:09:23.580248	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73740	2025-07-04 12:09:25.566924	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630965545,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73743	2025-07-04 12:09:25.641943	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":79}
73747	2025-07-04 12:09:26.196259	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73756	2025-07-04 12:09:26.765727	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":44}
74712	2025-07-04 12:21:55.102409	INFO	Shipment updated	database	{"meta":{"shipmentId":31,"updatedFields":["status"],"status":"shipped"}}
74725	2025-07-04 12:21:55.798538	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":35}}
75270	2025-07-04 12:26:50.097704	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":10}}
75277	2025-07-04 12:26:50.388036	INFO	Performance: getDocuments	database	{"duration":76}
75287	2025-07-04 12:26:50.810603	INFO	Shipment created	database	{"meta":{"shipmentId":48,"orderId":1,"status":"shipped"}}
76574	2025-07-04 12:37:37.22689	INFO	Performance: getInventory	database	{"meta":{},"duration":502}
76586	2025-07-04 12:37:37.327163	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
76594	2025-07-04 12:37:37.40905	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76604	2025-07-04 12:37:40.0173	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76609	2025-07-04 12:37:42.052484	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":2}
76617	2025-07-04 12:37:42.49568	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76631	2025-07-04 12:37:42.625122	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76636	2025-07-04 12:37:43.03152	INFO	Shipment updated	database	{"meta":{"shipmentId":56,"updatedFields":["status"],"oldStatus":"draft","newStatus":"shipped","status":"shipped"}}
76642	2025-07-04 12:37:43.084374	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76651	2025-07-04 12:37:43.136338	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76671	2025-07-04 12:37:43.461449	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76673	2025-07-04 12:37:43.501663	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
76681	2025-07-04 12:37:44.186994	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76693	2025-07-04 12:37:45.475689	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632665453,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76696	2025-07-04 12:37:45.553543	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76699	2025-07-04 12:37:46.965454	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
76701	2025-07-04 12:37:48.722828	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
76712	2025-07-04 12:37:48.76372	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
71897	2025-07-04 11:40:50.147313	INFO	Performance: getInventory	database	{"meta":{},"duration":145}
71905	2025-07-04 11:40:50.170554	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73609	2025-07-04 12:08:47.554633	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73616	2025-07-04 12:08:48.170967	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73634	2025-07-04 12:08:49.355013	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74713	2025-07-04 12:21:55.174168	INFO	Shipment created	database	{"meta":{"shipmentId":31,"orderId":1,"status":"draft"}}
74715	2025-07-04 12:21:55.299126	INFO	Shipment created	database	{"meta":{"shipmentId":32,"orderId":2,"status":"draft"}}
74717	2025-07-04 12:21:55.378161	INFO	Shipment created	database	{"meta":{"shipmentId":33,"orderId":1,"status":"draft"}}
74719	2025-07-04 12:21:55.459336	INFO	Shipment created	database	{"meta":{"shipmentId":35,"orderId":3,"status":"draft"}}
74721	2025-07-04 12:21:55.605799	INFO	Shipment deleted	database	{"meta":{"shipmentId":34}}
74723	2025-07-04 12:21:55.721172	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":33}}
75271	2025-07-04 12:26:50.177352	INFO	Performance: getInventory	database	{"meta":{},"duration":37}
75275	2025-07-04 12:26:50.300383	INFO	Shipment updated	database	{"meta":{"shipmentId":47,"updatedFields":["status"],"status":"shipped"}}
75276	2025-07-04 12:26:50.387113	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":4}}
75288	2025-07-04 12:26:50.851141	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76591	2025-07-04 12:37:37.350064	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"543ms","forced":false}}
76599	2025-07-04 12:37:37.431581	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":2}}
76601	2025-07-04 12:37:40.011345	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76630	2025-07-04 12:37:42.624737	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632662603,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76640	2025-07-04 12:37:43.07516	INFO	Shipment updated	app	{"meta":{"shipmentId":56,"updatedFields":["status"]}}
76652	2025-07-04 12:37:43.136969	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632663115,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76670	2025-07-04 12:37:43.460952	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76674	2025-07-04 12:37:43.501882	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632663481,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76678	2025-07-04 12:37:44.18656	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632664163,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76691	2025-07-04 12:37:45.474994	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76694	2025-07-04 12:37:45.552886	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":82}
76703	2025-07-04 12:37:48.723828	DEBUG	Starting: getShipments	database	\N
76715	2025-07-04 12:37:48.801301	INFO	Performance: getShipments	database	{"duration":78}
76719	2025-07-04 12:38:14.179087	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632694158,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76728	2025-07-04 12:38:26.24796	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76740	2025-07-04 12:38:33.250504	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76743	2025-07-04 12:38:45.32828	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76752	2025-07-04 12:39:11.413417	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77252	2025-07-04 12:45:37.29168	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77266	2025-07-04 12:45:37.859419	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77279	2025-07-04 12:45:38.407901	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633138387,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77282	2025-07-04 12:45:38.555022	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":151}
77287	2025-07-04 12:45:51.099127	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633151077,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77659	2025-07-04 12:57:15.389295	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77667	2025-07-04 12:57:15.453723	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633835435,"responseTime":194,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
71900	2025-07-04 11:40:50.159196	INFO	Performance: getSuppliers	database	{"duration":147}
71908	2025-07-04 11:40:50.180249	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
73610	2025-07-04 12:08:47.555708	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73615	2025-07-04 12:08:48.170728	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73622	2025-07-04 12:08:48.262913	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73627	2025-07-04 12:08:48.784977	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73631	2025-07-04 12:08:49.352103	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74714	2025-07-04 12:21:55.253015	INFO	Shipment updated	database	{"meta":{"shipmentId":31,"updatedFields":["status"],"status":"delivered"}}
74716	2025-07-04 12:21:55.337855	INFO	Shipment updated	database	{"meta":{"shipmentId":32,"updatedFields":["status"],"status":"cancelled"}}
74718	2025-07-04 12:21:55.422083	INFO	Shipment created	database	{"meta":{"shipmentId":34,"orderId":2,"status":"draft"}}
74720	2025-07-04 12:21:55.532553	INFO	Shipment deleted	database	{"meta":{"shipmentId":33}}
74722	2025-07-04 12:21:55.682956	INFO	Shipment deleted	database	{"meta":{"shipmentId":35}}
74724	2025-07-04 12:21:55.756885	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":34}}
75272	2025-07-04 12:26:50.192355	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":10}}
75274	2025-07-04 12:26:50.261151	INFO	Shipment created	database	{"meta":{"shipmentId":47,"orderId":91,"status":"draft"}}
75289	2025-07-04 12:26:50.851972	INFO	Performance: getInventory	database	{"meta":{},"duration":37}
75292	2025-07-04 12:26:50.927818	INFO	Shipment updated	database	{"meta":{"shipmentId":49,"updatedFields":["status"],"status":"shipped"}}
75296	2025-07-04 12:26:51.080912	INFO	Shipment created	database	{"meta":{"shipmentId":51,"orderId":1,"status":"draft"}}
75307	2025-07-04 12:26:51.485451	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":53}}
76595	2025-07-04 12:37:37.409408	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"882ms","forced":false}}
76603	2025-07-04 12:37:40.017086	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76611	2025-07-04 12:37:42.052665	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
76615	2025-07-04 12:37:42.45787	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76618	2025-07-04 12:37:42.498399	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632662479,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76626	2025-07-04 12:37:42.619832	INFO	Performance: POST /shipments	api	{"meta":{"statusCode":201,"responseSize":179},"duration":90}
76643	2025-07-04 12:37:43.08462	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76649	2025-07-04 12:37:43.127125	INFO	PUT /shipments/56	api	{"meta":{"method":"PUT","url":"/shipments/56","bodySize":18}}
76656	2025-07-04 12:37:43.16332	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76657	2025-07-04 12:37:43.204169	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":56,"itemsCount":1}}
76675	2025-07-04 12:37:43.501638	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76679	2025-07-04 12:37:44.186844	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76692	2025-07-04 12:37:45.475444	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76695	2025-07-04 12:37:45.553364	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76698	2025-07-04 12:37:46.926891	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76702	2025-07-04 12:37:48.723157	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
77253	2025-07-04 12:45:37.291871	DEBUG	Starting: getDocuments	database	\N
77264	2025-07-04 12:45:37.858685	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77280	2025-07-04 12:45:38.40808	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77283	2025-07-04 12:45:38.555345	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77288	2025-07-04 12:45:51.099265	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77660	2025-07-04 12:57:15.395272	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77668	2025-07-04 12:57:15.454086	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":192}
71901	2025-07-04 11:40:50.163301	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
71909	2025-07-04 11:40:50.185383	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"165ms","forced":false}}
73611	2025-07-04 12:08:47.556438	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73614	2025-07-04 12:08:48.170208	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630928148,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73635	2025-07-04 12:08:49.355263	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73650	2025-07-04 12:08:50.948622	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73655	2025-07-04 12:08:55.780914	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630935759,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73663	2025-07-04 12:09:12.573626	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73672	2025-07-04 12:09:14.140546	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73678	2025-07-04 12:09:15.873607	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630955853,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73688	2025-07-04 12:09:17.814894	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73694	2025-07-04 12:09:22.360331	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73714	2025-07-04 12:09:23.615534	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
73724	2025-07-04 12:09:24.620608	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73737	2025-07-04 12:09:25.565487	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73753	2025-07-04 12:09:26.734477	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
74830	2025-07-04 12:22:44.227371	INFO	Shipment updated	database	{"meta":{"shipmentId":36,"updatedFields":["status"],"status":"shipped"}}
74835	2025-07-04 12:22:44.504408	INFO	Shipment created	database	{"meta":{"shipmentId":38,"orderId":1,"status":"draft"}}
74837	2025-07-04 12:22:44.586392	INFO	Shipment created	database	{"meta":{"shipmentId":40,"orderId":3,"status":"draft"}}
74839	2025-07-04 12:22:44.730642	INFO	Shipment deleted	database	{"meta":{"shipmentId":39}}
74841	2025-07-04 12:22:44.842597	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":38}}
74843	2025-07-04 12:22:44.916832	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":40}}
75273	2025-07-04 12:26:50.260781	INFO	Shipment items created	database	{"meta":{"shipmentId":47,"itemsCount":1}}
75286	2025-07-04 12:26:50.810375	INFO	Shipment items created	database	{"meta":{"shipmentId":48,"itemsCount":1}}
76614	2025-07-04 12:37:42.458677	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76620	2025-07-04 12:37:42.49973	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
76624	2025-07-04 12:37:42.618848	INFO	Shipment created via service	app	{"meta":{"shipmentId":56,"orderId":1,"status":"draft"}}
76653	2025-07-04 12:37:43.138001	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76661	2025-07-04 12:37:43.231091	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":92}
76666	2025-07-04 12:37:43.457826	INFO	Shipment updated	app	{"meta":{"shipmentId":56,"updatedFields":["status"]}}
76684	2025-07-04 12:37:44.18852	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632664166,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76690	2025-07-04 12:37:45.474378	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76704	2025-07-04 12:37:48.724174	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76711	2025-07-04 12:37:48.763284	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76724	2025-07-04 12:38:14.222918	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76731	2025-07-04 12:38:26.289397	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76736	2025-07-04 12:38:33.2082	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76745	2025-07-04 12:38:45.328679	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76756	2025-07-04 12:39:11.447215	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":37}
77254	2025-07-04 12:45:37.292533	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77258	2025-07-04 12:45:37.381574	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":89}
77268	2025-07-04 12:45:37.862557	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77272	2025-07-04 12:45:37.902336	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":49}
77275	2025-07-04 12:45:38.404397	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77292	2025-07-04 12:45:51.101237	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77658	2025-07-04 12:57:15.385682	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
71912	2025-07-04 11:40:50.2137	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
73612	2025-07-04 12:08:47.559869	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630927411,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73621	2025-07-04 12:08:48.173156	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73624	2025-07-04 12:08:48.263575	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73630	2025-07-04 12:08:48.785485	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630928764,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73633	2025-07-04 12:08:49.35378	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73642	2025-07-04 12:08:49.396767	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630929375,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73645	2025-07-04 12:08:49.944784	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73652	2025-07-04 12:08:51.027629	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73657	2025-07-04 12:08:55.782115	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73667	2025-07-04 12:09:12.575397	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73668	2025-07-04 12:09:12.657093	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":84}
73674	2025-07-04 12:09:14.141032	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73683	2025-07-04 12:09:15.875928	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73691	2025-07-04 12:09:17.816471	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73693	2025-07-04 12:09:17.892501	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":78}
73696	2025-07-04 12:09:22.360855	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":695},"duration":0}
73711	2025-07-04 12:09:23.580864	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73716	2025-07-04 12:09:23.619335	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
73727	2025-07-04 12:09:24.622974	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630964600,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73728	2025-07-04 12:09:24.701275	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
73730	2025-07-04 12:09:25.147355	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73731	2025-07-04 12:09:25.227412	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73733	2025-07-04 12:09:25.563339	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74831	2025-07-04 12:22:44.314644	INFO	Shipment created	database	{"meta":{"shipmentId":36,"orderId":1,"status":"draft"}}
74833	2025-07-04 12:22:44.430938	INFO	Shipment created	database	{"meta":{"shipmentId":37,"orderId":2,"status":"draft"}}
74842	2025-07-04 12:22:44.88004	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":39}}
75318	2025-07-04 12:26:51.753029	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":3}}
75329	2025-07-04 12:26:53.911904	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75331	2025-07-04 12:26:53.978876	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
75338	2025-07-04 12:26:55.325501	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75350	2025-07-04 12:26:56.637944	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75352	2025-07-04 12:26:56.707214	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
76632	2025-07-04 12:37:42.654903	INFO	PUT /shipments/56	api	{"meta":{"method":"PUT","url":"/shipments/56","bodySize":20}}
76633	2025-07-04 12:37:42.728603	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":56,"itemsCount":1}}
76634	2025-07-04 12:37:42.87439	DEBUG	Shipment writeoff started	database	{"meta":{"operation":"processShipmentWriteoff","module":"storage","productId":443,"quantityToWriteoff":5,"shipmentId":56}}
76635	2025-07-04 12:37:43.030098	INFO	Shipment writeoff completed	database	{"meta":{"operation":"processShipmentWriteoff","module":"storage","productId":443,"quantityWrittenOff":5,"shipmentId":56}}
76637	2025-07-04 12:37:43.074247	INFO	Inventory cache invalidated after shipment status change	app	{"meta":{"shipmentId":56,"newStatus":"shipped"}}
76648	2025-07-04 12:37:43.12268	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632663102,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76655	2025-07-04 12:37:43.158844	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76659	2025-07-04 12:37:43.228475	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76665	2025-07-04 12:37:43.457241	INFO	Performance: PUT /shipments/56	api	{"meta":{"statusCode":200,"responseSize":179},"duration":330}
76680	2025-07-04 12:37:44.187031	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76689	2025-07-04 12:37:45.474038	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76710	2025-07-04 12:37:48.762336	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76722	2025-07-04 12:38:14.18098	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76723	2025-07-04 12:38:14.221173	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76725	2025-07-04 12:38:26.245923	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76733	2025-07-04 12:38:33.206888	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76742	2025-07-04 12:38:45.328037	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76750	2025-07-04 12:39:11.412485	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632751392,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77255	2025-07-04 12:45:37.292737	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
71911	2025-07-04 11:40:50.213062	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"133ms","forced":false}}
73613	2025-07-04 12:08:47.56189	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73617	2025-07-04 12:08:48.17119	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73626	2025-07-04 12:08:48.784581	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73636	2025-07-04 12:08:49.355412	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73647	2025-07-04 12:08:50.947453	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73660	2025-07-04 12:08:55.86063	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73662	2025-07-04 12:09:12.573298	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73671	2025-07-04 12:09:14.140376	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630954119,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73679	2025-07-04 12:09:15.873949	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73686	2025-07-04 12:09:17.814584	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630957794,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73699	2025-07-04 12:09:22.396222	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
73704	2025-07-04 12:09:22.957235	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630962936,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73707	2025-07-04 12:09:23.578561	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73715	2025-07-04 12:09:23.618413	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630963599,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73723	2025-07-04 12:09:24.620457	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73734	2025-07-04 12:09:25.564329	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74832	2025-07-04 12:22:44.382151	INFO	Shipment updated	database	{"meta":{"shipmentId":36,"updatedFields":["status"],"status":"delivered"}}
74834	2025-07-04 12:22:44.467372	INFO	Shipment updated	database	{"meta":{"shipmentId":37,"updatedFields":["status"],"status":"cancelled"}}
74836	2025-07-04 12:22:44.549665	INFO	Shipment created	database	{"meta":{"shipmentId":39,"orderId":2,"status":"draft"}}
74838	2025-07-04 12:22:44.658199	INFO	Shipment deleted	database	{"meta":{"shipmentId":38}}
74840	2025-07-04 12:22:44.805301	INFO	Shipment deleted	database	{"meta":{"shipmentId":40}}
75324	2025-07-04 12:26:53.90284	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75340	2025-07-04 12:26:55.326195	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75342	2025-07-04 12:26:56.023218	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75343	2025-07-04 12:26:56.099558	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
75345	2025-07-04 12:26:56.630022	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76660	2025-07-04 12:37:43.229099	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76668	2025-07-04 12:37:43.459453	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76677	2025-07-04 12:37:44.186329	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76706	2025-07-04 12:37:48.726642	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632668706,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77256	2025-07-04 12:45:37.292947	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77259	2025-07-04 12:45:37.387694	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77273	2025-07-04 12:45:37.903052	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"47ms","rowCount":1}}
77284	2025-07-04 12:45:38.555915	INFO	Performance: getDocuments	database	{"duration":149}
77289	2025-07-04 12:45:51.099599	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77295	2025-07-04 12:45:51.175707	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77661	2025-07-04 12:57:15.410285	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
71915	2025-07-04 11:41:02.631987	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71918	2025-07-04 11:41:12.743366	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":35941},"duration":73}
71920	2025-07-04 11:41:12.858664	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71921	2025-07-04 11:41:23.048664	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71924	2025-07-04 11:41:33.320953	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71926	2025-07-04 11:41:43.121864	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":37483},"duration":72}
71927	2025-07-04 11:41:43.507268	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71930	2025-07-04 11:41:53.766134	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71932	2025-07-04 11:42:03.956358	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71934	2025-07-04 11:42:13.589701	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":39025},"duration":73}
71935	2025-07-04 11:42:14.208678	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71938	2025-07-04 11:42:24.400739	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71940	2025-07-04 11:42:34.659479	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71942	2025-07-04 11:42:44.117492	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":40748},"duration":76}
71944	2025-07-04 11:42:44.851562	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71946	2025-07-04 11:42:55.107207	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71948	2025-07-04 11:43:00.151836	DEBUG	Starting: getProducts	database	\N
71950	2025-07-04 11:43:00.190579	DEBUG	Starting: getContractors	database	\N
71951	2025-07-04 11:43:00.228309	DEBUG	Starting: getSuppliers	database	\N
71959	2025-07-04 11:43:00.269999	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
71971	2025-07-04 11:43:00.309744	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
71981	2025-07-04 11:43:00.345705	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"194ms","forced":true}}
71983	2025-07-04 11:43:05.346592	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71986	2025-07-04 11:43:14.645421	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":49832},"duration":75}
71987	2025-07-04 11:43:15.550348	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71989	2025-07-04 11:43:20.713043	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
71991	2025-07-04 11:43:20.753379	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
71993	2025-07-04 11:43:25.739966	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71995	2025-07-04 11:43:26.483884	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
73700	2025-07-04 12:09:22.495982	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
73702	2025-07-04 12:09:22.956724	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73708	2025-07-04 12:09:23.579865	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630963553,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73738	2025-07-04 12:09:25.56572	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73746	2025-07-04 12:09:26.195522	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73752	2025-07-04 12:09:26.725043	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74844	2025-07-04 12:22:47.806634	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74855	2025-07-04 12:22:58.988551	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74860	2025-07-04 12:23:02.564978	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631782545,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74869	2025-07-04 12:23:05.627056	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631785604,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74881	2025-07-04 12:23:09.306059	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75332	2025-07-04 12:26:55.324144	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75347	2025-07-04 12:26:56.6367	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
76663	2025-07-04 12:37:43.415094	INFO	Shipment updated	database	{"meta":{"shipmentId":56,"updatedFields":["status"],"oldStatus":"shipped","newStatus":"draft","status":"draft"}}
76664	2025-07-04 12:37:43.456112	INFO	Inventory cache invalidated after shipment status change	app	{"meta":{"shipmentId":56,"newStatus":"draft"}}
76682	2025-07-04 12:37:44.187393	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76687	2025-07-04 12:37:45.473345	DEBUG	Starting: getDocuments	database	\N
76708	2025-07-04 12:37:48.726991	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76714	2025-07-04 12:37:48.801001	INFO	Retrieved all shipments	app	{"meta":{"count":3,"entity":"Shipment"}}
76718	2025-07-04 12:38:14.17872	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76727	2025-07-04 12:38:26.247344	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632706226,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76738	2025-07-04 12:38:33.211596	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76739	2025-07-04 12:38:33.249745	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
76741	2025-07-04 12:38:45.326936	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76751	2025-07-04 12:39:11.412453	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77257	2025-07-04 12:45:37.294889	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77260	2025-07-04 12:45:37.38871	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77267	2025-07-04 12:45:37.859711	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
71916	2025-07-04 11:41:02.63254	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
71917	2025-07-04 11:41:12.669953	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71919	2025-07-04 11:41:12.858286	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
71922	2025-07-04 11:41:23.049414	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
71923	2025-07-04 11:41:33.320546	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71925	2025-07-04 11:41:43.048144	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71928	2025-07-04 11:41:43.572023	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71929	2025-07-04 11:41:53.765844	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71931	2025-07-04 11:42:03.95596	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71933	2025-07-04 11:42:13.51503	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71936	2025-07-04 11:42:14.20952	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71937	2025-07-04 11:42:24.400336	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71939	2025-07-04 11:42:34.659093	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71941	2025-07-04 11:42:44.04244	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71943	2025-07-04 11:42:44.851183	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71945	2025-07-04 11:42:55.106723	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
71947	2025-07-04 11:43:00.15146	DEBUG	Starting: getWarehouses	database	\N
71949	2025-07-04 11:43:00.190291	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
71952	2025-07-04 11:43:00.228529	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
71958	2025-07-04 11:43:00.2698	DEBUG	Starting: getInventory	database	{"meta":{}}
71969	2025-07-04 11:43:00.309406	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":163,"duration":"165ms","forced":true}}
71979	2025-07-04 11:43:00.345364	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
73717	2025-07-04 12:09:23.695672	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73719	2025-07-04 12:09:24.09732	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73721	2025-07-04 12:09:24.167169	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":70}
73725	2025-07-04 12:09:24.621219	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73736	2025-07-04 12:09:25.565277	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73757	2025-07-04 12:09:26.929454	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":412754},"duration":184}
74845	2025-07-04 12:22:47.807107	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74857	2025-07-04 12:22:58.989202	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74859	2025-07-04 12:22:59.062377	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":69}
74867	2025-07-04 12:23:02.655382	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74876	2025-07-04 12:23:05.703972	INFO	Performance: getDocuments	database	{"duration":80}
74885	2025-07-04 12:23:09.306869	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631789282,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74890	2025-07-04 12:23:09.347737	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
74892	2025-07-04 12:23:09.832853	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74893	2025-07-04 12:23:09.907334	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
74902	2025-07-04 12:23:10.506535	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74906	2025-07-04 12:23:20.43389	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74915	2025-07-04 12:23:31.044497	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631811022,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74918	2025-07-04 12:23:31.119259	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
74921	2025-07-04 12:23:33.530123	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74930	2025-07-04 12:23:41.810248	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74939	2025-07-04 12:23:56.228068	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74946	2025-07-04 12:23:59.684731	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74955	2025-07-04 12:24:05.072757	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74958	2025-07-04 12:24:05.144155	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
74962	2025-07-04 12:24:13.344464	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74969	2025-07-04 12:24:26.978899	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631866958,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74983	2025-07-04 12:24:41.044204	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631881018,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74988	2025-07-04 12:24:41.192924	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631881174,"responseTime":153,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74991	2025-07-04 12:24:41.994515	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75008	2025-07-04 12:24:42.664542	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75021	2025-07-04 12:24:44.07265	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631884051,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75344	2025-07-04 12:26:56.099886	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75351	2025-07-04 12:26:56.706931	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
76676	2025-07-04 12:37:44.185342	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
71953	2025-07-04 11:43:00.233124	INFO	Manual cache warmup initiated	api	{"meta":{"ip":"127.0.0.1","userAgent":"curl/8.11.1"}}
71960	2025-07-04 11:43:00.270194	DEBUG	Starting: getInventory	database	{"meta":{}}
71970	2025-07-04 11:43:00.309578	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
71980	2025-07-04 11:43:00.345556	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"191ms","forced":true}}
71997	2025-07-04 11:43:26.521717	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
73718	2025-07-04 12:09:23.701218	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73720	2025-07-04 12:09:24.165699	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73722	2025-07-04 12:09:24.619916	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73735	2025-07-04 12:09:25.565087	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73754	2025-07-04 12:09:26.73534	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74846	2025-07-04 12:22:47.807377	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74852	2025-07-04 12:22:58.987487	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631778966,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74862	2025-07-04 12:23:02.565502	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74872	2025-07-04 12:23:05.628362	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74875	2025-07-04 12:23:05.70296	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74883	2025-07-04 12:23:09.306383	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
75353	2025-07-04 12:27:46.308731	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632066143,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75369	2025-07-04 12:27:49.304228	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632069283,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75375	2025-07-04 12:27:50.676954	DEBUG	Starting: getDocuments	database	\N
75394	2025-07-04 12:28:03.455269	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":268}}
75402	2025-07-04 12:28:04.27636	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75408	2025-07-04 12:28:04.979543	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75422	2025-07-04 12:28:05.894471	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
76688	2025-07-04 12:37:45.473719	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76707	2025-07-04 12:37:48.726811	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76713	2025-07-04 12:37:48.800655	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":624},"duration":80}
76717	2025-07-04 12:38:14.177943	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76726	2025-07-04 12:38:26.246832	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76747	2025-07-04 12:38:45.36432	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":37}
76749	2025-07-04 12:39:11.407904	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77261	2025-07-04 12:45:37.388887	INFO	Performance: getDocuments	database	{"duration":87}
77265	2025-07-04 12:45:37.85902	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77281	2025-07-04 12:45:38.40924	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77285	2025-07-04 12:45:38.556337	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77291	2025-07-04 12:45:51.10054	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77297	2025-07-04 12:45:51.17723	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":75}
77662	2025-07-04 12:57:15.411427	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633835247,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
71954	2025-07-04 11:43:00.232499	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":true}}
71961	2025-07-04 11:43:00.270325	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
71968	2025-07-04 11:43:00.305279	INFO	Performance: getInventory	database	{"meta":{},"duration":164}
71976	2025-07-04 11:43:00.340198	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73758	2025-07-04 12:09:32.09005	DEBUG	Starting: getDocuments	database	\N
73767	2025-07-04 12:09:32.128092	DEBUG	Starting: getInventory	database	{"meta":{}}
73777	2025-07-04 12:09:32.166441	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
73787	2025-07-04 12:09:32.208621	INFO	Performance: getSuppliers	database	{"duration":606}
73795	2025-07-04 12:09:32.55473	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"614ms","forced":false}}
73799	2025-07-04 12:09:32.700949	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73803	2025-07-04 12:09:37.258565	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73818	2025-07-04 12:09:50.439007	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73821	2025-07-04 12:09:50.517634	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73826	2025-07-04 12:09:54.045769	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
73836	2025-07-04 12:09:54.085296	INFO	Performance: getShipments	database	{"duration":40}
73839	2025-07-04 12:09:54.125456	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73847	2025-07-04 12:10:00.097058	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73855	2025-07-04 12:10:19.234803	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73857	2025-07-04 12:10:29.651676	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74847	2025-07-04 12:22:47.807701	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631767787,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74858	2025-07-04 12:22:59.061751	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74861	2025-07-04 12:23:02.565307	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74868	2025-07-04 12:23:05.627167	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74888	2025-07-04 12:23:09.346	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
74896	2025-07-04 12:23:10.433898	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74909	2025-07-04 12:23:20.504359	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74913	2025-07-04 12:23:31.043423	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74922	2025-07-04 12:23:33.530878	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74927	2025-07-04 12:23:41.805892	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74937	2025-07-04 12:23:56.227668	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74943	2025-07-04 12:23:59.684013	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631839663,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74952	2025-07-04 12:24:05.070883	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74966	2025-07-04 12:24:13.420182	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74967	2025-07-04 12:24:26.978285	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74982	2025-07-04 12:24:41.043967	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74992	2025-07-04 12:24:41.994924	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
75006	2025-07-04 12:24:42.664156	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631882642,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75354	2025-07-04 12:27:46.30941	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75367	2025-07-04 12:27:49.303947	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75376	2025-07-04 12:27:50.677746	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75393	2025-07-04 12:28:03.455111	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75397	2025-07-04 12:28:03.791443	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75398	2025-07-04 12:28:03.866471	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
75400	2025-07-04 12:28:04.269274	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75415	2025-07-04 12:28:04.98455	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75419	2025-07-04 12:28:05.893279	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75427	2025-07-04 12:28:05.971735	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":83}
76720	2025-07-04 12:38:14.179665	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76729	2025-07-04 12:38:26.248317	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76735	2025-07-04 12:38:33.207968	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76744	2025-07-04 12:38:45.328493	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76753	2025-07-04 12:39:11.413834	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77262	2025-07-04 12:45:37.856986	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77271	2025-07-04 12:45:37.901893	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633137883,"responseTime":51,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77274	2025-07-04 12:45:38.403305	DEBUG	Starting: getDocuments	database	\N
77290	2025-07-04 12:45:51.100004	DEBUG	Starting: getDocuments	database	\N
71955	2025-07-04 11:43:00.237186	INFO	Принудительный разогрев всего кеша	app	\N
71963	2025-07-04 11:43:00.275165	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"50ms","forced":true}}
71973	2025-07-04 11:43:00.310836	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"172ms","forced":true}}
73759	2025-07-04 12:09:32.112079	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73769	2025-07-04 12:09:32.146731	DEBUG	Starting: getInventory	database	{"meta":{}}
73779	2025-07-04 12:09:32.183078	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"603ms","forced":false}}
73789	2025-07-04 12:09:32.552595	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"609ms","forced":false}}
73831	2025-07-04 12:09:54.04948	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630994028,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74848	2025-07-04 12:22:47.807937	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74854	2025-07-04 12:22:58.988082	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74863	2025-07-04 12:23:02.565772	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74871	2025-07-04 12:23:05.628168	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74874	2025-07-04 12:23:05.703105	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":82}
74886	2025-07-04 12:23:09.307036	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74899	2025-07-04 12:23:10.434632	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74907	2025-07-04 12:23:20.434034	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74912	2025-07-04 12:23:31.043237	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74920	2025-07-04 12:23:33.529886	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74933	2025-07-04 12:23:41.881424	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74935	2025-07-04 12:23:56.22676	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74947	2025-07-04 12:23:59.68528	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74954	2025-07-04 12:24:05.071541	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74960	2025-07-04 12:24:13.343945	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74970	2025-07-04 12:24:26.979115	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74974	2025-07-04 12:24:27.052368	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
74975	2025-07-04 12:24:40.047979	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74977	2025-07-04 12:24:40.120366	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":72}
74980	2025-07-04 12:24:41.043524	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74996	2025-07-04 12:24:41.995711	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631881973,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74998	2025-07-04 12:24:42.071461	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
75012	2025-07-04 12:24:42.707131	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
75019	2025-07-04 12:24:44.072349	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75355	2025-07-04 12:27:46.309971	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75373	2025-07-04 12:27:49.305521	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75381	2025-07-04 12:27:50.684186	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75385	2025-07-04 12:27:50.754145	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
75391	2025-07-04 12:28:03.44139	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75405	2025-07-04 12:28:04.279231	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75407	2025-07-04 12:28:04.526783	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":257}
75412	2025-07-04 12:28:04.980982	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75425	2025-07-04 12:28:05.895934	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632085873,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76732	2025-07-04 12:38:26.40235	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
76734	2025-07-04 12:38:33.206722	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76748	2025-07-04 12:38:45.364694	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76755	2025-07-04 12:39:11.44627	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77263	2025-07-04 12:45:37.857569	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77664	2025-07-04 12:57:15.418499	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
71956	2025-07-04 11:43:00.253517	INFO	POST /cache/warmup	api	{"meta":{"method":"POST","url":"/cache/warmup","bodySize":2}}
71967	2025-07-04 11:43:00.302487	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"51ms","forced":true}}
71978	2025-07-04 11:43:00.344469	INFO	Performance: getSuppliers	database	{"duration":190}
71990	2025-07-04 11:43:20.722381	INFO	Получение всех отгрузок	app	{"meta":{}}
71996	2025-07-04 11:43:26.48555	INFO	Получение всех отгрузок	app	{"meta":{}}
73760	2025-07-04 12:09:32.113902	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
73770	2025-07-04 12:09:32.149033	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
73780	2025-07-04 12:09:32.186802	INFO	Performance: getShipments	database	{"duration":568}
73791	2025-07-04 12:09:32.553131	INFO	Performance: getContractors	database	{"duration":608}
73814	2025-07-04 12:09:50.438042	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":3}
73828	2025-07-04 12:09:54.047992	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73832	2025-07-04 12:09:54.08375	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
73842	2025-07-04 12:10:00.018482	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73849	2025-07-04 12:10:19.156152	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73862	2025-07-04 12:10:29.726082	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74849	2025-07-04 12:22:47.808532	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74851	2025-07-04 12:22:47.877884	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":72}
74856	2025-07-04 12:22:58.989021	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74865	2025-07-04 12:23:02.566928	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74866	2025-07-04 12:23:02.649033	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":84}
74873	2025-07-04 12:23:05.628747	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74877	2025-07-04 12:23:05.704376	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74887	2025-07-04 12:23:09.307731	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74900	2025-07-04 12:23:10.435634	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631790414,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74908	2025-07-04 12:23:20.434833	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74910	2025-07-04 12:23:20.506181	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":71}
74914	2025-07-04 12:23:31.044202	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74923	2025-07-04 12:23:33.531069	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74929	2025-07-04 12:23:41.807007	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631821784,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74940	2025-07-04 12:23:56.229089	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631836205,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74941	2025-07-04 12:23:56.297223	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
74945	2025-07-04 12:23:59.68449	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74956	2025-07-04 12:24:05.072668	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631845052,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74964	2025-07-04 12:24:13.34511	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631853322,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74965	2025-07-04 12:24:13.418404	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":72}
74972	2025-07-04 12:24:26.979991	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74984	2025-07-04 12:24:41.044929	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74989	2025-07-04 12:24:41.194002	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":151}
75001	2025-07-04 12:24:42.072365	INFO	Performance: getDocuments	database	{"duration":81}
75010	2025-07-04 12:24:42.664867	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75013	2025-07-04 12:24:42.708329	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631882687,"responseTime":48,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75016	2025-07-04 12:24:43.541412	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75023	2025-07-04 12:24:44.142579	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75356	2025-07-04 12:27:46.310511	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75371	2025-07-04 12:27:49.304977	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75377	2025-07-04 12:27:50.677985	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75395	2025-07-04 12:28:03.456309	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632083435,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
75404	2025-07-04 12:28:04.277573	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75411	2025-07-04 12:28:04.980558	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632084957,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75424	2025-07-04 12:28:05.895422	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75428	2025-07-04 12:28:05.972985	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
76746	2025-07-04 12:38:45.32909	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632725306,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76754	2025-07-04 12:39:11.414576	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77270	2025-07-04 12:45:37.863479	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77278	2025-07-04 12:45:38.407745	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
71957	2025-07-04 11:43:00.266358	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
71966	2025-07-04 11:43:00.302025	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
71975	2025-07-04 11:43:00.33709	INFO	Performance: getInventory	database	{"meta":{},"duration":178}
73761	2025-07-04 12:09:32.116298	DEBUG	Starting: getWarehouses	database	\N
73771	2025-07-04 12:09:32.152239	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":27769}}
73781	2025-07-04 12:09:32.205393	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
73792	2025-07-04 12:09:32.553328	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
73815	2025-07-04 12:09:50.43821	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630990413,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73829	2025-07-04 12:09:54.048489	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74850	2025-07-04 12:22:47.875106	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74853	2025-07-04 12:22:58.987299	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74864	2025-07-04 12:23:02.566506	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74870	2025-07-04 12:23:05.627562	DEBUG	Starting: getDocuments	database	\N
74884	2025-07-04 12:23:09.306323	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74889	2025-07-04 12:23:09.346253	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631789328,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74897	2025-07-04 12:23:10.434063	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74904	2025-07-04 12:23:20.433476	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74916	2025-07-04 12:23:31.045408	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74919	2025-07-04 12:23:33.529483	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631813509,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74931	2025-07-04 12:23:41.810982	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74936	2025-07-04 12:23:56.227354	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74948	2025-07-04 12:23:59.687406	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74950	2025-07-04 12:23:59.756474	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
74951	2025-07-04 12:24:05.068569	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74963	2025-07-04 12:24:13.344611	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74971	2025-07-04 12:24:26.979782	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74979	2025-07-04 12:24:41.043197	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74993	2025-07-04 12:24:41.99515	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
75004	2025-07-04 12:24:42.66383	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75357	2025-07-04 12:27:46.312706	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75372	2025-07-04 12:27:49.30527	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":1306},"duration":1}
75380	2025-07-04 12:27:50.683896	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75386	2025-07-04 12:27:50.755803	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
75390	2025-07-04 12:28:03.438435	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75417	2025-07-04 12:28:04.987113	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":268},"duration":1}
75429	2025-07-04 12:28:05.973202	INFO	Performance: getDocuments	database	{"duration":80}
76757	2025-07-04 12:40:28.04512	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77276	2025-07-04 12:45:38.404818	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77293	2025-07-04 12:45:51.102105	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77296	2025-07-04 12:45:51.175931	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77665	2025-07-04 12:57:15.419119	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
71962	2025-07-04 11:43:00.272958	INFO	Performance: getProducts	database	{"duration":49}
71972	2025-07-04 11:43:00.310644	INFO	Performance: getContractors	database	{"duration":171}
71982	2025-07-04 11:43:00.347988	INFO	Performance: POST /cache/warmup	api	{"meta":{"statusCode":200,"responseSize":708},"duration":196}
71984	2025-07-04 11:43:05.347572	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
71985	2025-07-04 11:43:14.568965	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71988	2025-07-04 11:43:15.551071	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
71992	2025-07-04 11:43:20.753729	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
71994	2025-07-04 11:43:25.740975	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
71998	2025-07-04 11:43:26.522629	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
73762	2025-07-04 12:09:32.118602	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
73772	2025-07-04 12:09:32.154763	DEBUG	Starting: getProducts	database	\N
73783	2025-07-04 12:09:32.207035	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"605ms","forced":false}}
73793	2025-07-04 12:09:32.553467	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73798	2025-07-04 12:09:32.699838	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"1150ms","forced":false}}
73802	2025-07-04 12:09:37.256334	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":6}
73816	2025-07-04 12:09:50.438343	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73838	2025-07-04 12:09:54.124194	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73841	2025-07-04 12:10:00.018341	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73850	2025-07-04 12:10:19.156349	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631019136,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73860	2025-07-04 12:10:29.680013	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74878	2025-07-04 12:23:05.743785	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74882	2025-07-04 12:23:09.305962	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74898	2025-07-04 12:23:10.433812	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74901	2025-07-04 12:23:10.506248	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
74903	2025-07-04 12:23:20.432948	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631800410,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74917	2025-07-04 12:23:31.118527	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74924	2025-07-04 12:23:33.531458	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74926	2025-07-04 12:23:33.607707	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
74932	2025-07-04 12:23:41.812268	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74934	2025-07-04 12:23:41.883697	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
74942	2025-07-04 12:23:56.301765	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74949	2025-07-04 12:23:59.756146	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74957	2025-07-04 12:24:05.143567	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74959	2025-07-04 12:24:13.343314	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74973	2025-07-04 12:24:27.051897	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74976	2025-07-04 12:24:40.120043	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74978	2025-07-04 12:24:41.04279	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75007	2025-07-04 12:24:42.664312	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
75358	2025-07-04 12:27:46.313573	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75361	2025-07-04 12:27:46.378289	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":226}
75366	2025-07-04 12:27:49.303791	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632069280,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
75378	2025-07-04 12:27:50.682119	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632070661,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75392	2025-07-04 12:28:03.454798	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75401	2025-07-04 12:28:04.276108	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632084255,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75413	2025-07-04 12:28:04.984109	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75421	2025-07-04 12:28:05.894093	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75426	2025-07-04 12:28:05.971281	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
76758	2025-07-04 12:40:28.046218	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77286	2025-07-04 12:45:51.098771	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77666	2025-07-04 12:57:15.421484	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
71964	2025-07-04 11:43:00.281931	INFO	Performance: getWarehouses	database	{"duration":50}
71974	2025-07-04 11:43:00.320469	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73763	2025-07-04 12:09:32.120915	DEBUG	Starting: getContractors	database	\N
73773	2025-07-04 12:09:32.157536	DEBUG	Starting: getShipments	database	\N
73785	2025-07-04 12:09:32.207831	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73797	2025-07-04 12:09:32.688866	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"1145ms","forced":false}}
73806	2025-07-04 12:09:37.296162	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
73807	2025-07-04 12:09:37.377815	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73812	2025-07-04 12:09:50.437108	DEBUG	Starting: getDocuments	database	\N
73830	2025-07-04 12:09:54.048941	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73833	2025-07-04 12:09:54.083716	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
73840	2025-07-04 12:10:00.017995	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73848	2025-07-04 12:10:19.155771	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73858	2025-07-04 12:10:29.653181	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74879	2025-07-04 12:23:05.744438	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74880	2025-07-04 12:23:09.302575	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75359	2025-07-04 12:27:46.314298	DEBUG	Starting: getDocuments	database	\N
75364	2025-07-04 12:27:46.379363	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
75365	2025-07-04 12:27:49.303474	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
75379	2025-07-04 12:27:50.682332	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75384	2025-07-04 12:27:50.753532	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":78}
75387	2025-07-04 12:28:03.437611	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632083417,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75414	2025-07-04 12:28:04.984395	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":268}}
75418	2025-07-04 12:28:05.892917	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76759	2025-07-04 12:40:28.042092	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632827895,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77298	2025-07-04 12:46:25.228393	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77323	2025-07-04 12:46:33.470597	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
77339	2025-07-04 12:46:34.8604	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77348	2025-07-04 12:46:59.067836	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77356	2025-07-04 12:47:04.213359	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":604},"duration":0}
77367	2025-07-04 12:47:11.07919	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77663	2025-07-04 12:57:15.412008	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
71965	2025-07-04 11:43:00.299281	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
71977	2025-07-04 11:43:00.343106	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":163,"duration":"180ms","forced":true}}
73764	2025-07-04 12:09:32.123528	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
73774	2025-07-04 12:09:32.162917	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
73788	2025-07-04 12:09:32.208751	INFO	Performance: getInventory	database	{"meta":{},"duration":600}
73800	2025-07-04 12:09:32.701162	INFO	Performance: getDocuments	database	{"duration":1139}
73804	2025-07-04 12:09:37.258815	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73819	2025-07-04 12:09:50.439205	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73822	2025-07-04 12:09:50.517809	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73827	2025-07-04 12:09:54.045966	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
73837	2025-07-04 12:09:54.08553	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73844	2025-07-04 12:10:00.020184	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73851	2025-07-04 12:10:19.157849	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73861	2025-07-04 12:10:29.684883	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73863	2025-07-04 12:10:29.728367	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":71}
74891	2025-07-04 12:23:09.426091	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74894	2025-07-04 12:23:09.907226	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74895	2025-07-04 12:23:10.429565	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74905	2025-07-04 12:23:20.433728	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74911	2025-07-04 12:23:31.042879	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74925	2025-07-04 12:23:33.606079	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74928	2025-07-04 12:23:41.806246	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74938	2025-07-04 12:23:56.227834	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74944	2025-07-04 12:23:59.683979	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74953	2025-07-04 12:24:05.071351	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74961	2025-07-04 12:24:13.343865	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74968	2025-07-04 12:24:26.978735	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74981	2025-07-04 12:24:41.043812	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74997	2025-07-04 12:24:41.995904	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75000	2025-07-04 12:24:42.071953	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
75003	2025-07-04 12:24:42.663109	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75020	2025-07-04 12:24:44.072323	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75360	2025-07-04 12:27:46.318494	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75363	2025-07-04 12:27:46.379148	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
75370	2025-07-04 12:27:49.304431	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":1306}}
75396	2025-07-04 12:28:03.458806	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":268},"duration":2}
75399	2025-07-04 12:28:03.867155	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75406	2025-07-04 12:28:04.526415	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75410	2025-07-04 12:28:04.980163	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76760	2025-07-04 12:40:28.047766	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77299	2025-07-04 12:46:25.234805	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77313	2025-07-04 12:46:26.757695	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77318	2025-07-04 12:46:33.465995	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77325	2025-07-04 12:46:33.501502	DEBUG	Starting: getShipments	database	\N
77337	2025-07-04 12:46:34.856001	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
77353	2025-07-04 12:46:59.330328	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1150099},"duration":235}
77360	2025-07-04 12:47:04.24102	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
77362	2025-07-04 12:47:11.077649	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77378	2025-07-04 12:47:11.772253	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
77669	2025-07-04 12:57:15.454239	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"190ms","rowCount":1}}
71999	2025-07-04 11:43:30.24292	DEBUG	Starting: getSuppliers	database	\N
72009	2025-07-04 11:43:30.590309	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
72019	2025-07-04 11:43:30.637162	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72029	2025-07-04 11:43:30.731125	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
72038	2025-07-04 11:43:30.781828	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
72042	2025-07-04 11:43:33.213714	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72064	2025-07-04 11:50:16.314262	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
72068	2025-07-04 11:50:16.376993	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
72074	2025-07-04 11:50:16.41481	DEBUG	Starting: getInventory	database	{"meta":{}}
72080	2025-07-04 11:50:16.451614	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"3622ms","forced":false}}
72087	2025-07-04 11:50:16.485731	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"3677ms","forced":false}}
72097	2025-07-04 11:50:16.519767	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"3801ms","forced":false}}
72119	2025-07-04 11:50:18.720949	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72233	2025-07-04 11:54:01.317106	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73042	2025-07-04 12:04:08.685251	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73045	2025-07-04 12:04:08.92408	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
73050	2025-07-04 12:04:08.973896	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
73053	2025-07-04 12:04:09.388254	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
73059	2025-07-04 12:04:09.428027	DEBUG	Starting: getShipments	database	\N
73062	2025-07-04 12:04:09.839742	INFO	Performance: getSuppliers	database	{"duration":1180}
73067	2025-07-04 12:04:09.876299	INFO	Performance: getInventory	database	{"meta":{},"duration":1418}
73069	2025-07-04 12:04:10.286843	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"2785ms","forced":false}}
73079	2025-07-04 12:04:10.326068	INFO	Performance: getShipments	database	{"duration":2769}
73090	2025-07-04 12:04:11.194291	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73103	2025-07-04 12:04:18.307051	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73107	2025-07-04 12:04:18.385373	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73114	2025-07-04 12:04:19.167255	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630659145,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73126	2025-07-04 12:04:20.361471	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73132	2025-07-04 12:04:20.442204	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":83}
73138	2025-07-04 12:04:23.693339	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73154	2025-07-04 12:04:25.897246	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630665877,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73177	2025-07-04 12:04:28.957793	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630668936,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73185	2025-07-04 12:04:29.994269	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630669974,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73202	2025-07-04 12:04:38.451661	INFO	Performance: getDocuments	database	{"duration":74}
73207	2025-07-04 12:04:45.788377	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":4}
73219	2025-07-04 12:05:00.923315	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73230	2025-07-04 12:05:18.554512	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73234	2025-07-04 12:05:21.258516	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":0}
73252	2025-07-04 12:05:23.587504	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73765	2025-07-04 12:09:32.12724	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
73775	2025-07-04 12:09:32.164901	INFO	Performance: getWarehouses	database	{"duration":599}
73786	2025-07-04 12:09:32.208456	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"607ms","forced":false}}
73794	2025-07-04 12:09:32.554548	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73801	2025-07-04 12:09:32.701323	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"1148ms","forced":false}}
73809	2025-07-04 12:09:37.460861	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":423000},"duration":208}
73810	2025-07-04 12:09:47.585611	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73817	2025-07-04 12:09:50.438754	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73823	2025-07-04 12:09:50.519545	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":91}
73835	2025-07-04 12:09:54.084335	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73843	2025-07-04 12:10:00.020029	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73852	2025-07-04 12:10:19.157832	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74985	2025-07-04 12:24:41.157383	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72000	2025-07-04 11:43:30.584937	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
72011	2025-07-04 11:43:30.631584	DEBUG	Starting: getInventory	database	{"meta":{}}
72020	2025-07-04 11:43:30.705975	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72030	2025-07-04 11:43:30.775184	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"1052ms","forced":false}}
72040	2025-07-04 11:43:30.881096	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"1063ms","forced":false}}
72048	2025-07-04 11:43:33.321132	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":61155},"duration":117}
72049	2025-07-04 11:43:37.357624	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72054	2025-07-04 11:43:43.32021	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":1}
72065	2025-07-04 11:50:16.310048	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72070	2025-07-04 11:50:16.379504	DEBUG	Starting: getContractors	database	\N
72076	2025-07-04 11:50:16.417536	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":24798}}
72081	2025-07-04 11:50:16.457189	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72090	2025-07-04 11:50:16.492872	INFO	Performance: getInventory	database	{"meta":{},"duration":3693}
72098	2025-07-04 11:50:16.528153	INFO	Performance: getSuppliers	database	{"duration":3811}
72111	2025-07-04 11:50:17.229244	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":94}
72115	2025-07-04 11:50:18.716974	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72230	2025-07-04 11:54:01.313157	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":4}
73043	2025-07-04 12:04:08.685367	DEBUG	Starting: getContractors	database	\N
73046	2025-07-04 12:04:08.92445	DEBUG	Starting: getSuppliers	database	\N
73049	2025-07-04 12:04:08.97403	DEBUG	Starting: getInventory	database	{"meta":{}}
73054	2025-07-04 12:04:09.388592	DEBUG	Starting: getProducts	database	\N
73057	2025-07-04 12:04:09.427124	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
73061	2025-07-04 12:04:09.553342	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"1182ms","forced":false}}
73064	2025-07-04 12:04:09.842933	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73068	2025-07-04 12:04:09.878647	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"1424ms","forced":false}}
73070	2025-07-04 12:04:10.287043	INFO	Performance: getInventory	database	{"meta":{},"duration":2779}
73078	2025-07-04 12:04:10.326188	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
73089	2025-07-04 12:04:11.194135	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73096	2025-07-04 12:04:17.489315	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73100	2025-07-04 12:04:18.305585	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630658283,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73120	2025-07-04 12:04:19.211857	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
73125	2025-07-04 12:04:20.361318	DEBUG	Starting: getDocuments	database	\N
73131	2025-07-04 12:04:20.441861	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73139	2025-07-04 12:04:23.693689	DEBUG	Starting: getDocuments	database	\N
73156	2025-07-04 12:04:25.897629	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73176	2025-07-04 12:04:28.957605	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73186	2025-07-04 12:04:29.994205	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73195	2025-07-04 12:04:38.375388	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73766	2025-07-04 12:09:32.127743	DEBUG	Starting: getSuppliers	database	\N
73776	2025-07-04 12:09:32.16514	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"602ms","forced":false}}
73782	2025-07-04 12:09:32.206825	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73790	2025-07-04 12:09:32.552957	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"611ms","forced":false}}
73813	2025-07-04 12:09:50.43765	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73824	2025-07-04 12:09:54.044729	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
73834	2025-07-04 12:09:54.08416	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
73845	2025-07-04 12:10:00.020938	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630999998,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73846	2025-07-04 12:10:00.096709	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":80}
73853	2025-07-04 12:10:19.159634	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73854	2025-07-04 12:10:19.234092	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":80}
73856	2025-07-04 12:10:29.65023	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74986	2025-07-04 12:24:41.15966	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74995	2025-07-04 12:24:41.995499	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75005	2025-07-04 12:24:42.66401	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75022	2025-07-04 12:24:44.073162	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72001	2025-07-04 11:43:30.585516	DEBUG	Starting: getInventory	database	{"meta":{}}
72012	2025-07-04 11:43:30.63128	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72022	2025-07-04 11:43:30.706348	INFO	Performance: getInventory	database	{"meta":{},"duration":1041}
72032	2025-07-04 11:43:30.77566	INFO	Performance: getInventory	database	{"meta":{},"duration":1047}
72063	2025-07-04 11:50:16.298923	DEBUG	Starting: getDocuments	database	\N
72069	2025-07-04 11:50:16.377608	DEBUG	Starting: getSuppliers	database	\N
72075	2025-07-04 11:50:16.415129	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72082	2025-07-04 11:50:16.456916	INFO	Performance: getDocuments	database	{"duration":3619}
72089	2025-07-04 11:50:16.492189	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72099	2025-07-04 11:50:16.528406	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
72109	2025-07-04 11:50:17.133608	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72113	2025-07-04 11:50:18.716298	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72123	2025-07-04 11:50:18.752921	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72232	2025-07-04 11:54:01.310321	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73044	2025-07-04 12:04:08.73616	DEBUG	Starting: getDocuments	database	\N
73047	2025-07-04 12:04:08.924649	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
73051	2025-07-04 12:04:08.979581	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
73055	2025-07-04 12:04:09.388755	DEBUG	Starting: getWarehouses	database	\N
73058	2025-07-04 12:04:09.42747	INFO	Performance: getWarehouses	database	{"duration":1179}
73063	2025-07-04 12:04:09.840093	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
73066	2025-07-04 12:04:09.875979	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73072	2025-07-04 12:04:10.287963	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73080	2025-07-04 12:04:10.326441	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"2805ms","forced":false}}
73084	2025-07-04 12:04:10.371251	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"2871ms","forced":false}}
73086	2025-07-04 12:04:11.190181	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":6}
73094	2025-07-04 12:04:17.488679	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73102	2025-07-04 12:04:18.305929	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73116	2025-07-04 12:04:19.16793	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73128	2025-07-04 12:04:20.361814	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73133	2025-07-04 12:04:20.442358	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73135	2025-07-04 12:04:22.837468	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73136	2025-07-04 12:04:22.91674	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73140	2025-07-04 12:04:23.693829	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73157	2025-07-04 12:04:25.897645	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73178	2025-07-04 12:04:28.957951	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73187	2025-07-04 12:04:29.994608	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73190	2025-07-04 12:04:30.06983	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":79}
73196	2025-07-04 12:04:38.375949	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630678352,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73212	2025-07-04 12:04:45.836161	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
73214	2025-07-04 12:04:55.97243	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":0}
73216	2025-07-04 12:05:00.913618	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73231	2025-07-04 12:05:18.555858	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73235	2025-07-04 12:05:21.258684	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73254	2025-07-04 12:05:23.772263	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":308912},"duration":179}
73255	2025-07-04 12:05:33.772753	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73768	2025-07-04 12:09:32.130503	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
73778	2025-07-04 12:09:32.166843	INFO	Performance: getProducts	database	{"duration":603}
73784	2025-07-04 12:09:32.207621	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
73796	2025-07-04 12:09:32.575815	INFO	Performance: getInventory	database	{"meta":{},"duration":610}
73805	2025-07-04 12:09:37.259731	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73808	2025-07-04 12:09:37.378471	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":2}
73811	2025-07-04 12:09:47.586451	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
73820	2025-07-04 12:09:50.516536	INFO	Performance: getDocuments	database	{"duration":87}
73825	2025-07-04 12:09:54.045272	DEBUG	Starting: getShipments	database	\N
74987	2025-07-04 12:24:41.19131	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"149ms","rowCount":1}}
74990	2025-07-04 12:24:41.993995	DEBUG	Starting: getDocuments	database	\N
75009	2025-07-04 12:24:42.664692	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
75018	2025-07-04 12:24:44.071992	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72002	2025-07-04 11:43:30.585876	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72010	2025-07-04 11:43:30.631298	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":23700}}
72021	2025-07-04 11:43:30.705915	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":2,"duration":"1043ms","forced":false}}
72031	2025-07-04 11:43:30.775447	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72047	2025-07-04 11:43:33.259548	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":40}
72050	2025-07-04 11:43:37.358003	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72058	2025-07-04 11:43:43.322368	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72059	2025-07-04 11:43:43.411664	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72066	2025-07-04 11:50:16.360546	DEBUG	Starting: getWarehouses	database	\N
72073	2025-07-04 11:50:16.404591	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72078	2025-07-04 11:50:16.440772	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
72085	2025-07-04 11:50:16.477007	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
72095	2025-07-04 11:50:16.512592	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":163,"duration":"3711ms","forced":false}}
72104	2025-07-04 11:50:16.548377	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"3822ms","forced":false}}
72106	2025-07-04 11:50:17.129642	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72120	2025-07-04 11:50:18.721138	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72231	2025-07-04 11:54:01.313731	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":599},"duration":1}
73048	2025-07-04 12:04:08.926528	DEBUG	Starting: getInventory	database	{"meta":{}}
73052	2025-07-04 12:04:08.981562	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":27043}}
73056	2025-07-04 12:04:09.390481	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
73060	2025-07-04 12:04:09.551301	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
73065	2025-07-04 12:04:09.845059	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"1183ms","forced":false}}
73073	2025-07-04 12:04:10.291141	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"2787ms","forced":false}}
73085	2025-07-04 12:04:10.373108	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"2869ms","forced":false}}
73088	2025-07-04 12:04:11.19201	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73095	2025-07-04 12:04:17.489136	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630657466,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73101	2025-07-04 12:04:18.305734	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73119	2025-07-04 12:04:19.169464	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73122	2025-07-04 12:04:19.216026	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":45}
73134	2025-07-04 12:04:20.442929	INFO	Performance: getDocuments	database	{"duration":81}
73137	2025-07-04 12:04:22.918672	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73146	2025-07-04 12:04:23.774592	INFO	Performance: getDocuments	database	{"duration":80}
73159	2025-07-04 12:04:25.899072	DEBUG	Starting: getDocuments	database	\N
73164	2025-07-04 12:04:25.989465	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":92}
73170	2025-07-04 12:04:28.735564	INFO	Performance: getDocument	database	{"duration":81}
73179	2025-07-04 12:04:28.958199	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73189	2025-07-04 12:04:29.996287	DEBUG	Starting: getDocuments	database	\N
73192	2025-07-04 12:04:30.070481	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73199	2025-07-04 12:04:38.377431	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73205	2025-07-04 12:04:38.455258	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":76}
73213	2025-07-04 12:04:45.990396	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":300628},"duration":200}
73215	2025-07-04 12:04:55.974288	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73223	2025-07-04 12:05:01.112023	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":302763},"duration":191}
73225	2025-07-04 12:05:11.115032	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73227	2025-07-04 12:05:18.546849	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73239	2025-07-04 12:05:21.27322	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73246	2025-07-04 12:05:22.938664	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630722915,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73247	2025-07-04 12:05:23.582547	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73859	2025-07-04 12:10:29.654027	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631029627,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74994	2025-07-04 12:24:41.995296	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74999	2025-07-04 12:24:42.071794	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":82}
75002	2025-07-04 12:24:42.662766	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75011	2025-07-04 12:24:42.70683	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":47}
72003	2025-07-04 11:43:30.586194	DEBUG	Starting: getDocuments	database	\N
72014	2025-07-04 11:43:30.632381	INFO	Получение всех отгрузок	app	{"meta":{}}
72024	2025-07-04 11:43:30.707174	INFO	Performance: getWarehouses	database	{"duration":1047}
72039	2025-07-04 11:43:30.781992	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"1061ms","forced":false}}
72041	2025-07-04 11:43:33.21294	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72067	2025-07-04 11:50:16.365104	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
72084	2025-07-04 11:50:16.474048	INFO	Performance: getContractors	database	{"duration":3667}
72093	2025-07-04 11:50:16.510981	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72103	2025-07-04 11:50:16.547452	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"3822ms","forced":false}}
72108	2025-07-04 11:50:17.129889	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":5}
72121	2025-07-04 11:50:18.721395	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629818700,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72234	2025-07-04 11:54:01.998675	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73071	2025-07-04 12:04:10.286657	INFO	Performance: getProducts	database	{"duration":2786}
73105	2025-07-04 12:04:18.307864	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73108	2025-07-04 12:04:18.385208	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73112	2025-07-04 12:04:19.166996	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73121	2025-07-04 12:04:19.213333	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630659194,"responseTime":46,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73123	2025-07-04 12:04:20.360716	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73144	2025-07-04 12:04:23.695099	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73149	2025-07-04 12:04:23.778539	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73150	2025-07-04 12:04:24.73887	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73151	2025-07-04 12:04:24.822589	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":83}
73153	2025-07-04 12:04:25.896896	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73161	2025-07-04 12:04:25.985651	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73165	2025-07-04 12:04:28.652959	DEBUG	Database operation started	database	{"meta":{"operation":"getDocument","module":"storage","queryType":"select","documentId":300}}
73168	2025-07-04 12:04:28.734356	INFO	Performance: GET /documents/300	api	{"meta":{"statusCode":200,"responseSize":234},"duration":84}
73180	2025-07-04 12:04:28.959523	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630668932,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73182	2025-07-04 12:04:29.993577	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73200	2025-07-04 12:04:38.379329	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73203	2025-07-04 12:04:38.452586	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73208	2025-07-04 12:04:45.790115	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73220	2025-07-04 12:05:00.923588	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
73228	2025-07-04 12:05:18.55278	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73237	2025-07-04 12:05:21.270662	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73242	2025-07-04 12:05:22.936957	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73250	2025-07-04 12:05:23.585238	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73864	2025-07-04 12:10:36.580386	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
75014	2025-07-04 12:24:43.463787	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75015	2025-07-04 12:24:43.540686	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
75017	2025-07-04 12:24:44.066532	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75362	2025-07-04 12:27:46.378601	INFO	Performance: getDocuments	database	{"duration":223}
75368	2025-07-04 12:27:49.304092	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
75382	2025-07-04 12:27:50.734261	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75389	2025-07-04 12:28:03.438244	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75403	2025-07-04 12:28:04.276543	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75409	2025-07-04 12:28:04.979895	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75423	2025-07-04 12:28:05.894768	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
76762	2025-07-04 12:40:28.049654	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77300	2025-07-04 12:46:25.24308	DEBUG	Starting: getDocuments	database	\N
77316	2025-07-04 12:46:26.795576	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":36}
77320	2025-07-04 12:46:33.466825	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77328	2025-07-04 12:46:33.506381	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
77331	2025-07-04 12:46:33.548221	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
77334	2025-07-04 12:46:34.848906	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77351	2025-07-04 12:46:59.073969	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77361	2025-07-04 12:47:04.456479	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1151272},"duration":233}
72005	2025-07-04 11:43:30.58685	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
72015	2025-07-04 11:43:30.632694	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
72025	2025-07-04 11:43:30.707328	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":163,"duration":"1046ms","forced":false}}
72034	2025-07-04 11:43:30.77657	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":163,"duration":"1057ms","forced":false}}
72071	2025-07-04 11:50:16.384753	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
72077	2025-07-04 11:50:16.422961	DEBUG	Starting: getProducts	database	\N
72083	2025-07-04 11:50:16.458092	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":2,"duration":"3627ms","forced":false}}
72091	2025-07-04 11:50:16.497512	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":163,"duration":"3698ms","forced":false}}
72101	2025-07-04 11:50:16.53408	INFO	Performance: getWarehouses	database	{"duration":3819}
72107	2025-07-04 11:50:17.129784	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72117	2025-07-04 11:50:18.719584	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
72235	2025-07-04 11:54:02.006711	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73074	2025-07-04 12:04:10.290963	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73091	2025-07-04 12:04:11.198407	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
73109	2025-07-04 12:04:18.385769	INFO	Performance: getDocuments	database	{"duration":77}
73118	2025-07-04 12:04:19.168474	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73130	2025-07-04 12:04:20.362531	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73143	2025-07-04 12:04:23.694817	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73147	2025-07-04 12:04:23.775034	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":83}
73160	2025-07-04 12:04:25.899297	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73163	2025-07-04 12:04:25.988468	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73167	2025-07-04 12:04:28.653512	INFO	GET /documents/300	api	{"meta":{"method":"GET","url":"/documents/300","bodySize":2}}
73169	2025-07-04 12:04:28.734837	INFO	Database operation completed	database	{"meta":{"operation":"getDocument","module":"storage","documentId":300,"duration":"undefinedms","itemsCount":1}}
73175	2025-07-04 12:04:28.957412	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73188	2025-07-04 12:04:29.995571	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73193	2025-07-04 12:04:30.070947	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73198	2025-07-04 12:04:38.376736	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73211	2025-07-04 12:04:45.797651	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73222	2025-07-04 12:05:00.966065	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":45}
73224	2025-07-04 12:05:11.114166	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":1}
73226	2025-07-04 12:05:18.546137	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":1}
73238	2025-07-04 12:05:21.272355	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
73245	2025-07-04 12:05:22.938369	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73248	2025-07-04 12:05:23.58315	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
73865	2025-07-04 12:10:36.580904	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75024	2025-07-04 12:24:44.143152	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
75374	2025-07-04 12:27:49.41918	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75383	2025-07-04 12:27:50.752454	INFO	Performance: getDocuments	database	{"duration":75}
75388	2025-07-04 12:28:03.437989	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75416	2025-07-04 12:28:04.985137	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632084964,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
75420	2025-07-04 12:28:05.89342	DEBUG	Starting: getDocuments	database	\N
76761	2025-07-04 12:40:28.049793	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77301	2025-07-04 12:46:25.242295	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77307	2025-07-04 12:46:25.30553	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":198}
77311	2025-07-04 12:46:26.755388	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77327	2025-07-04 12:46:33.50592	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77329	2025-07-04 12:46:33.54763	INFO	Retrieved all shipments	app	{"meta":{"count":3,"entity":"Shipment"}}
77338	2025-07-04 12:46:34.856262	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77347	2025-07-04 12:46:59.066776	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77359	2025-07-04 12:47:04.214405	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77363	2025-07-04 12:47:11.078013	DEBUG	Starting: getDocuments	database	\N
77369	2025-07-04 12:47:11.151246	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":81}
77380	2025-07-04 12:47:11.814762	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":41}
77383	2025-07-04 12:47:22.045754	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
72004	2025-07-04 11:43:30.586579	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72013	2025-07-04 11:43:30.631879	DEBUG	Starting: getProducts	database	\N
72023	2025-07-04 11:43:30.706567	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72033	2025-07-04 11:43:30.775806	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72046	2025-07-04 11:43:33.220832	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72051	2025-07-04 11:43:37.358242	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629417337,"responseTime":0,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72055	2025-07-04 11:43:43.320619	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629423299,"responseTime":1,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72072	2025-07-04 11:50:16.402412	DEBUG	Starting: getInventory	database	{"meta":{}}
72079	2025-07-04 11:50:16.441781	INFO	Получение всех отгрузок	app	{"meta":{}}
72086	2025-07-04 11:50:16.480454	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"3670ms","forced":false}}
72096	2025-07-04 11:50:16.519017	INFO	Performance: getProducts	database	{"duration":3799}
72110	2025-07-04 11:50:17.136272	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72116	2025-07-04 11:50:18.717956	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629818696,"responseTime":1,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72236	2025-07-04 11:54:02.134166	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":3329}
72239	2025-07-04 11:54:08.985439	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":599},"duration":1}
73075	2025-07-04 12:04:10.296011	INFO	Performance: getContractors	database	{"duration":2790}
73115	2025-07-04 12:04:19.167702	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73127	2025-07-04 12:04:20.361621	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630660341,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73141	2025-07-04 12:04:23.694025	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630663673,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73158	2025-07-04 12:04:25.898483	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73172	2025-07-04 12:04:28.955874	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73866	2025-07-04 12:10:36.581931	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
75025	2025-07-04 12:24:59.373676	DEBUG	Starting: getDocuments	database	\N
75032	2025-07-04 12:24:59.441519	DEBUG	Starting: getInventory	database	{"meta":{}}
75042	2025-07-04 12:24:59.716077	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75050	2025-07-04 12:24:59.767798	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"556ms","forced":false}}
75058	2025-07-04 12:24:59.864202	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":412,"duration":"836ms","forced":false}}
75121	2025-07-04 12:25:19.931794	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75124	2025-07-04 12:25:19.971699	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631919951,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75127	2025-07-04 12:25:21.790477	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75137	2025-07-04 12:25:22.732154	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75143	2025-07-04 12:25:22.803411	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":102}
75145	2025-07-04 12:25:23.554696	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75155	2025-07-04 12:25:23.594476	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
75161	2025-07-04 12:25:26.220218	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75176	2025-07-04 12:25:28.400542	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75184	2025-07-04 12:25:30.866912	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75198	2025-07-04 12:25:35.611549	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75430	2025-07-04 12:29:10.222268	DEBUG	Starting: getDocuments	database	\N
75447	2025-07-04 12:29:17.855066	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76763	2025-07-04 12:40:28.086696	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77302	2025-07-04 12:46:25.243843	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77314	2025-07-04 12:46:26.758697	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":606},"duration":1}
77319	2025-07-04 12:46:33.466643	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633193444,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77671	2025-07-04 12:58:57.113272	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77682	2025-07-04 13:00:53.00873	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
77686	2025-07-04 13:01:01.325145	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77689	2025-07-04 13:01:12.22783	INFO	Performance: getWarehouses	database	{"duration":9922}
77697	2025-07-04 13:04:05.824572	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":93}}
77705	2025-07-04 13:04:09.427555	INFO	Performance: getInventory	database	{"meta":{},"duration":13602}
77714	2025-07-04 13:04:10.62872	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"15400ms","forced":false}}
77719	2025-07-04 13:20:53.058841	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
77722	2025-07-04 13:20:53.134016	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
72006	2025-07-04 11:43:30.587389	DEBUG	Starting: getWarehouses	database	\N
72016	2025-07-04 11:43:30.633264	INFO	Performance: getContractors	database	{"duration":1037}
72026	2025-07-04 11:43:30.707887	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"1049ms","forced":false}}
72037	2025-07-04 11:43:30.780885	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"1059ms","forced":false}}
72044	2025-07-04 11:43:33.21868	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72052	2025-07-04 11:43:37.359495	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72056	2025-07-04 11:43:43.321552	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72088	2025-07-04 11:50:16.48819	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72100	2025-07-04 11:50:16.530267	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"3815ms","forced":false}}
72112	2025-07-04 11:50:17.303171	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":75734},"duration":170}
72114	2025-07-04 11:50:18.716194	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72124	2025-07-04 11:50:18.789221	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72237	2025-07-04 11:54:02.197866	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":101339},"duration":3396}
72238	2025-07-04 11:54:08.984783	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73076	2025-07-04 12:04:10.299811	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
73082	2025-07-04 12:04:10.355434	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"2854ms","forced":false}}
73087	2025-07-04 12:04:11.190904	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73104	2025-07-04 12:04:18.307476	DEBUG	Starting: getDocuments	database	\N
73111	2025-07-04 12:04:19.166646	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73124	2025-07-04 12:04:20.36109	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73142	2025-07-04 12:04:23.694305	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73155	2025-07-04 12:04:25.897666	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73174	2025-07-04 12:04:28.957203	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73184	2025-07-04 12:04:29.994017	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73194	2025-07-04 12:04:38.375075	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73209	2025-07-04 12:04:45.796461	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
73218	2025-07-04 12:05:00.923056	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73229	2025-07-04 12:05:18.55432	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
73241	2025-07-04 12:05:21.450945	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":306687},"duration":184}
73244	2025-07-04 12:05:22.937808	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73253	2025-07-04 12:05:23.621425	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
73256	2025-07-04 12:05:33.773133	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":0}
73867	2025-07-04 12:10:36.582731	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631036560,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75026	2025-07-04 12:24:59.399989	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75035	2025-07-04 12:24:59.442331	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
75036	2025-07-04 12:24:59.71433	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":1306,"duration":"532ms","forced":false}}
75048	2025-07-04 12:24:59.766222	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":4}}
75053	2025-07-04 12:24:59.86201	INFO	Performance: getInventory	database	{"meta":{},"duration":556}
75063	2025-07-04 12:24:59.953321	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2109,"duration":"887ms","forced":false}}
75073	2025-07-04 12:25:03.269102	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
75104	2025-07-04 12:25:18.994364	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75116	2025-07-04 12:25:19.929216	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75134	2025-07-04 12:25:22.697808	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75147	2025-07-04 12:25:23.55752	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75157	2025-07-04 12:25:26.218321	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75172	2025-07-04 12:25:28.398685	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75182	2025-07-04 12:25:30.865257	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631930844,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75192	2025-07-04 12:25:35.609312	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75202	2025-07-04 12:25:35.64773	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
75431	2025-07-04 12:29:10.234076	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75446	2025-07-04 12:29:17.854829	DEBUG	Starting: getDocuments	database	\N
76764	2025-07-04 12:40:28.210004	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":175}
77303	2025-07-04 12:46:25.244371	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633185096,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72007	2025-07-04 11:43:30.587841	DEBUG	Starting: getContractors	database	\N
72018	2025-07-04 11:43:30.63387	INFO	Performance: getDocuments	database	{"duration":1034}
72028	2025-07-04 11:43:30.730846	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"1050ms","forced":false}}
72035	2025-07-04 11:43:30.780592	INFO	Performance: getSuppliers	database	{"duration":1058}
72043	2025-07-04 11:43:33.213897	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":6}
72092	2025-07-04 11:50:16.502104	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72102	2025-07-04 11:50:16.542267	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
72105	2025-07-04 11:50:17.129341	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72118	2025-07-04 11:50:18.720739	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72240	2025-07-04 11:54:51.051266	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73077	2025-07-04 12:04:10.304307	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"2793ms","forced":false}}
73081	2025-07-04 12:04:10.355075	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73092	2025-07-04 12:04:11.307869	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":116}
73098	2025-07-04 12:04:17.489501	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73099	2025-07-04 12:04:18.305209	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73113	2025-07-04 12:04:19.167142	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73173	2025-07-04 12:04:28.956986	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73183	2025-07-04 12:04:29.993858	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73197	2025-07-04 12:04:38.376191	DEBUG	Starting: getDocuments	database	\N
73210	2025-07-04 12:04:45.796674	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73217	2025-07-04 12:05:00.922771	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73233	2025-07-04 12:05:18.825473	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":305120},"duration":176}
73240	2025-07-04 12:05:21.294344	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
73243	2025-07-04 12:05:22.937491	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73249	2025-07-04 12:05:23.583714	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73868	2025-07-04 12:10:36.582559	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73870	2025-07-04 12:10:36.659675	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
75027	2025-07-04 12:24:59.414353	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
75038	2025-07-04 12:24:59.714827	DEBUG	Starting: getInventory	database	{"meta":{}}
75046	2025-07-04 12:24:59.765923	INFO	Performance: getWarehouses	database	{"duration":534}
75056	2025-07-04 12:24:59.863244	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":7}}
75066	2025-07-04 12:25:00.031776	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
75071	2025-07-04 12:25:03.266	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
75105	2025-07-04 12:25:18.994941	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75115	2025-07-04 12:25:19.928966	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75132	2025-07-04 12:25:22.697187	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631922677,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75149	2025-07-04 12:25:23.558745	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631923537,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75158	2025-07-04 12:25:26.218981	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75166	2025-07-04 12:25:26.258698	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
75168	2025-07-04 12:25:28.395191	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75178	2025-07-04 12:25:28.433667	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":37}
75180	2025-07-04 12:25:30.865399	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75194	2025-07-04 12:25:35.610347	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75432	2025-07-04 12:29:10.234836	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632150095,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75450	2025-07-04 12:29:17.930801	INFO	Performance: getDocuments	database	{"duration":75}
76765	2025-07-04 12:41:18.482211	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
76770	2025-07-04 12:41:18.522349	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76779	2025-07-04 12:41:18.558489	DEBUG	Starting: getShipments	database	\N
76789	2025-07-04 12:41:18.594642	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
76801	2025-07-04 12:41:18.833846	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"474ms","forced":false}}
76831	2025-07-04 12:41:37.146259	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76842	2025-07-04 12:41:38.992745	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76861	2025-07-04 12:41:41.653865	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
72008	2025-07-04 11:43:30.588217	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
72017	2025-07-04 11:43:30.633583	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"1041ms","forced":false}}
72027	2025-07-04 11:43:30.708062	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
72036	2025-07-04 11:43:30.780755	INFO	Performance: getProducts	database	{"duration":1059}
72045	2025-07-04 11:43:33.219001	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72053	2025-07-04 11:43:37.35997	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
72057	2025-07-04 11:43:43.321756	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72060	2025-07-04 11:43:43.41438	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":404},"duration":2}
72094	2025-07-04 11:50:16.51204	INFO	Performance: getInventory	database	{"meta":{},"duration":3699}
72122	2025-07-04 11:50:18.723656	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72125	2025-07-04 11:50:18.791688	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":67}
72241	2025-07-04 11:54:51.060218	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73083	2025-07-04 12:04:10.356471	INFO	Performance: getDocuments	database	{"duration":2847}
73093	2025-07-04 12:04:11.441594	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":276305},"duration":246}
73097	2025-07-04 12:04:17.489418	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73106	2025-07-04 12:04:18.308306	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73110	2025-07-04 12:04:18.386812	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":79}
73117	2025-07-04 12:04:19.168281	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73129	2025-07-04 12:04:20.362207	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73145	2025-07-04 12:04:23.695217	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73148	2025-07-04 12:04:23.778351	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73152	2025-07-04 12:04:24.823806	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73162	2025-07-04 12:04:25.986734	INFO	Performance: getDocuments	database	{"duration":90}
73166	2025-07-04 12:04:28.653355	DEBUG	Starting: getDocument	database	\N
73171	2025-07-04 12:04:28.736035	DEBUG	Retrieved document by ID	api	{"meta":{"id":300,"found":true,"entity":"Document"}}
73181	2025-07-04 12:04:28.959736	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73191	2025-07-04 12:04:30.070149	INFO	Performance: getDocuments	database	{"duration":77}
73201	2025-07-04 12:04:38.379514	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73204	2025-07-04 12:04:38.453648	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73206	2025-07-04 12:04:45.783853	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73221	2025-07-04 12:05:00.924315	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":1}
73232	2025-07-04 12:05:18.591138	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":44}
73236	2025-07-04 12:05:21.259348	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73251	2025-07-04 12:05:23.58736	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":0}
73869	2025-07-04 12:10:36.583339	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75028	2025-07-04 12:24:59.41495	DEBUG	Starting: getWarehouses	database	\N
75039	2025-07-04 12:24:59.714964	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
75047	2025-07-04 12:24:59.766093	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":6}}
75057	2025-07-04 12:24:59.863851	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":7}}
75067	2025-07-04 12:25:00.031897	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"983ms","forced":false}}
75069	2025-07-04 12:25:03.263597	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
75106	2025-07-04 12:25:18.995374	DEBUG	Starting: getDocuments	database	\N
75112	2025-07-04 12:25:19.071098	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":578},"duration":74}
75113	2025-07-04 12:25:19.928497	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75135	2025-07-04 12:25:22.697924	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75141	2025-07-04 12:25:22.771962	INFO	Retrieved all shipments	app	{"meta":{"count":13,"entity":"Shipment"}}
75153	2025-07-04 12:25:23.593261	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
75159	2025-07-04 12:25:26.219169	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631926195,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75174	2025-07-04 12:25:28.400278	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75183	2025-07-04 12:25:30.865957	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75195	2025-07-04 12:25:35.610566	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75433	2025-07-04 12:29:10.235292	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75448	2025-07-04 12:29:17.855308	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75451	2025-07-04 12:29:17.931906	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":77}
76766	2025-07-04 12:41:18.514341	DEBUG	Starting: getInventory	database	{"meta":{}}
76776	2025-07-04 12:41:18.549873	DEBUG	Starting: getSuppliers	database	\N
76785	2025-07-04 12:41:18.59005	INFO	Performance: getProducts	database	{"duration":464}
77720	2025-07-04 13:20:53.11729	INFO	Performance: getWarehouses	database	{"duration":620}
72061	2025-07-04 11:43:53.612008	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":404},"duration":1}
72126	2025-07-04 11:50:56.988973	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629856833,"responseTime":0,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72137	2025-07-04 11:50:57.06707	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72139	2025-07-04 11:50:58.143097	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72149	2025-07-04 11:50:59.667426	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72157	2025-07-04 11:50:59.708	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72166	2025-07-04 11:51:00.419016	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629860395,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72177	2025-07-04 11:51:01.952814	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":1}
72242	2025-07-04 11:54:51.061501	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
73257	2025-07-04 12:05:36.919231	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73277	2025-07-04 12:05:37.648093	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
73284	2025-07-04 12:05:39.269744	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73298	2025-07-04 12:05:39.789348	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73311	2025-07-04 12:05:41.513964	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630741494,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73329	2025-07-04 12:05:43.038952	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73334	2025-07-04 12:05:43.079815	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
73340	2025-07-04 12:05:43.946773	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73353	2025-07-04 12:05:48.758232	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73364	2025-07-04 12:06:02.334828	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73378	2025-07-04 12:06:20.288145	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73390	2025-07-04 12:06:34.536605	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73871	2025-07-04 12:10:36.659478	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75029	2025-07-04 12:24:59.415365	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
75041	2025-07-04 12:24:59.71584	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":31186}}
75052	2025-07-04 12:24:59.767311	INFO	Performance: getSuppliers	database	{"duration":552}
75062	2025-07-04 12:24:59.899054	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":10}}
75074	2025-07-04 12:25:03.273344	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
75103	2025-07-04 12:25:18.99393	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631918972,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75120	2025-07-04 12:25:19.931167	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75123	2025-07-04 12:25:19.970557	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
75125	2025-07-04 12:25:21.713624	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75126	2025-07-04 12:25:21.790526	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
75129	2025-07-04 12:25:22.694472	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75152	2025-07-04 12:25:23.559786	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75164	2025-07-04 12:25:26.220683	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75171	2025-07-04 12:25:28.396691	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75187	2025-07-04 12:25:30.867475	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75197	2025-07-04 12:25:35.611199	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75434	2025-07-04 12:29:10.245838	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75442	2025-07-04 12:29:17.853329	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
76767	2025-07-04 12:41:18.519926	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76777	2025-07-04 12:41:18.555522	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76786	2025-07-04 12:41:18.591725	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"464ms","forced":false}}
76795	2025-07-04 12:41:18.832404	INFO	Performance: getInventory	database	{"meta":{},"duration":467}
76806	2025-07-04 12:41:18.871229	INFO	Performance: getShipments	database	{"duration":742}
76810	2025-07-04 12:41:24.075874	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76826	2025-07-04 12:41:35.789028	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1042062},"duration":249}
76837	2025-07-04 12:41:37.222556	INFO	Performance: getDocuments	database	{"duration":76}
76848	2025-07-04 12:41:39.027506	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
76855	2025-07-04 12:41:41.651133	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76863	2025-07-04 12:41:41.68703	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76866	2025-07-04 12:41:41.73644	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":624},"duration":84}
77304	2025-07-04 12:46:25.247545	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77308	2025-07-04 12:46:25.305711	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77312	2025-07-04 12:46:26.755675	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72062	2025-07-04 11:43:53.612439	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72127	2025-07-04 11:50:56.990251	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72133	2025-07-04 11:50:57.03231	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72144	2025-07-04 11:50:58.16704	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63071},"duration":4}
72152	2025-07-04 11:50:59.669295	DEBUG	Starting: getDocuments	database	\N
72164	2025-07-04 11:51:00.419225	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72169	2025-07-04 11:51:00.462372	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629860443,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72171	2025-07-04 11:51:01.065241	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72172	2025-07-04 11:51:01.105165	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72179	2025-07-04 11:51:01.953055	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72243	2025-07-04 11:54:51.065148	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73258	2025-07-04 12:05:36.919709	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630736894,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73269	2025-07-04 12:05:37.611158	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73300	2025-07-04 12:05:39.789914	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73313	2025-07-04 12:05:41.513807	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73330	2025-07-04 12:05:43.038938	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630743017,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73333	2025-07-04 12:05:43.079605	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
73347	2025-07-04 12:05:44.019467	INFO	Performance: getDocuments	database	{"duration":70}
73351	2025-07-04 12:05:48.756832	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73363	2025-07-04 12:06:02.334464	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73377	2025-07-04 12:06:20.288027	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73391	2025-07-04 12:06:34.536543	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73872	2025-07-04 12:11:38.432591	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631098283,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73907	2025-07-04 12:11:57.826237	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73909	2025-07-04 12:11:57.908653	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":83}
73916	2025-07-04 12:12:10.027356	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73918	2025-07-04 12:12:11.409711	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73936	2025-07-04 12:12:13.438929	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73940	2025-07-04 12:12:13.514472	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":82}
73943	2025-07-04 12:12:14.290027	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73953	2025-07-04 12:12:14.341122	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631134311,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73960	2025-07-04 12:12:15.531183	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631135511,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73972	2025-07-04 12:12:17.108883	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75030	2025-07-04 12:24:59.439076	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
75037	2025-07-04 12:24:59.714301	DEBUG	Starting: getProducts	database	\N
75049	2025-07-04 12:24:59.766396	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":301,"duration":"534ms","forced":false}}
75055	2025-07-04 12:24:59.862866	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":412,"duration":"561ms","forced":false}}
75065	2025-07-04 12:25:00.030274	INFO	Performance: getDocuments	database	{"duration":974}
75072	2025-07-04 12:25:03.266378	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
75109	2025-07-04 12:25:19.067991	INFO	Performance: getDocuments	database	{"duration":72}
75114	2025-07-04 12:25:19.928803	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75133	2025-07-04 12:25:22.69763	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75138	2025-07-04 12:25:22.771408	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2739},"duration":78}
75148	2025-07-04 12:25:23.557811	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75165	2025-07-04 12:25:26.254847	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
75177	2025-07-04 12:25:28.431977	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"34ms","rowCount":1}}
75189	2025-07-04 12:25:30.904696	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
75193	2025-07-04 12:25:35.609671	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75203	2025-07-04 12:25:35.647988	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631935629,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75435	2025-07-04 12:29:10.249533	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75438	2025-07-04 12:29:10.330283	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
75449	2025-07-04 12:29:17.855965	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
76768	2025-07-04 12:41:18.520355	DEBUG	Starting: getInventory	database	{"meta":{}}
76778	2025-07-04 12:41:18.556117	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":1227}}
76787	2025-07-04 12:41:18.593907	INFO	Performance: getSuppliers	database	{"duration":462}
72128	2025-07-04 11:50:56.990876	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629856847,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72153	2025-07-04 11:50:59.66941	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72162	2025-07-04 11:51:00.418797	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72180	2025-07-04 11:51:01.953164	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72244	2025-07-04 11:54:51.065615	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":599},"duration":0}
73259	2025-07-04 12:05:36.919938	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73270	2025-07-04 12:05:37.611995	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73285	2025-07-04 12:05:39.270269	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73301	2025-07-04 12:05:39.790076	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630739768,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73312	2025-07-04 12:05:41.514188	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73328	2025-07-04 12:05:43.037895	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73338	2025-07-04 12:05:43.208455	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":49}
73342	2025-07-04 12:05:43.947048	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73354	2025-07-04 12:05:48.758558	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73365	2025-07-04 12:06:02.334998	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73379	2025-07-04 12:06:20.288318	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630780266,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73392	2025-07-04 12:06:34.536944	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630794515,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73395	2025-07-04 12:06:34.632535	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":95}
73873	2025-07-04 12:11:38.437536	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73908	2025-07-04 12:11:57.908305	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73910	2025-07-04 12:12:09.954458	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73920	2025-07-04 12:12:11.420153	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73930	2025-07-04 12:12:12.048206	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
73937	2025-07-04 12:12:13.439052	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73938	2025-07-04 12:12:13.513891	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73944	2025-07-04 12:12:14.290363	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73952	2025-07-04 12:12:14.340823	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
73955	2025-07-04 12:12:15.079528	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73956	2025-07-04 12:12:15.154434	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
73958	2025-07-04 12:12:15.529967	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73974	2025-07-04 12:12:17.109648	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75031	2025-07-04 12:24:59.44091	DEBUG	Starting: getSuppliers	database	\N
75043	2025-07-04 12:24:59.716252	DEBUG	Starting: getShipments	database	\N
75051	2025-07-04 12:24:59.768153	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
75061	2025-07-04 12:24:59.898848	INFO	Performance: getShipments	database	{"duration":849}
75075	2025-07-04 12:25:03.31055	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
75100	2025-07-04 12:25:13.458813	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
75102	2025-07-04 12:25:18.993703	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75122	2025-07-04 12:25:19.968463	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
75130	2025-07-04 12:25:22.694967	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75139	2025-07-04 12:25:22.771656	INFO	Performance: getShipments	database	{"duration":76}
75150	2025-07-04 12:25:23.558916	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75162	2025-07-04 12:25:26.220392	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75170	2025-07-04 12:25:28.396533	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75179	2025-07-04 12:25:28.434666	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631928414,"responseTime":38,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75188	2025-07-04 12:25:30.867611	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75191	2025-07-04 12:25:30.906328	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":45}
75196	2025-07-04 12:25:35.610928	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75436	2025-07-04 12:29:10.249454	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75441	2025-07-04 12:29:10.331358	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":221}
75444	2025-07-04 12:29:17.854133	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75453	2025-07-04 12:29:17.932492	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
76769	2025-07-04 12:41:18.520782	DEBUG	Starting: getDocuments	database	\N
76780	2025-07-04 12:41:18.558698	DEBUG	Starting: getProducts	database	\N
76788	2025-07-04 12:41:18.594115	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"466ms","forced":false}}
77305	2025-07-04 12:46:25.247484	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
72129	2025-07-04 11:50:56.991668	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72155	2025-07-04 11:50:59.707651	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":44}
72159	2025-07-04 11:51:00.415083	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72181	2025-07-04 11:51:01.953266	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72184	2025-07-04 11:51:01.989089	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72245	2025-07-04 11:54:51.074668	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73260	2025-07-04 12:05:36.920958	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73275	2025-07-04 12:05:37.612853	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73279	2025-07-04 12:05:37.654036	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
73281	2025-07-04 12:05:38.168555	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73282	2025-07-04 12:05:38.246279	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":81}
73287	2025-07-04 12:05:39.271424	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73303	2025-07-04 12:05:39.790905	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73306	2025-07-04 12:05:39.831491	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630739812,"responseTime":48,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73310	2025-07-04 12:05:40.972126	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73317	2025-07-04 12:05:41.515289	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73322	2025-07-04 12:05:41.557663	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630741537,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73335	2025-07-04 12:05:43.081643	INFO	Performance: getShipments	database	{"duration":46}
73345	2025-07-04 12:05:43.947966	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73357	2025-07-04 12:05:48.759933	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73359	2025-07-04 12:05:48.841107	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":84}
73367	2025-07-04 12:06:02.335343	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73381	2025-07-04 12:06:20.289397	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73394	2025-07-04 12:06:34.538202	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73397	2025-07-04 12:06:34.633812	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73874	2025-07-04 12:11:38.441627	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73905	2025-07-04 12:11:57.825307	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73913	2025-07-04 12:12:09.960264	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73919	2025-07-04 12:12:11.417701	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73934	2025-07-04 12:12:13.43796	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631133416,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73947	2025-07-04 12:12:14.291691	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73976	2025-07-04 12:12:17.110398	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73979	2025-07-04 12:12:17.149428	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631137130,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75033	2025-07-04 12:24:59.441697	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
75060	2025-07-04 12:24:59.864577	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":7}}
75108	2025-07-04 12:25:18.996433	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75111	2025-07-04 12:25:19.07097	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":3}}
75117	2025-07-04 12:25:19.929402	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75131	2025-07-04 12:25:22.695168	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75151	2025-07-04 12:25:23.559553	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75163	2025-07-04 12:25:26.22053	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75167	2025-07-04 12:25:26.260669	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631926239,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75169	2025-07-04 12:25:28.396409	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75186	2025-07-04 12:25:30.867289	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75200	2025-07-04 12:25:35.611847	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75437	2025-07-04 12:29:10.252412	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75440	2025-07-04 12:29:10.3312	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
75445	2025-07-04 12:29:17.854247	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75452	2025-07-04 12:29:17.932097	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
76771	2025-07-04 12:41:18.524198	DEBUG	Starting: getWarehouses	database	\N
76781	2025-07-04 12:41:18.561141	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76800	2025-07-04 12:41:18.833622	INFO	Performance: getWarehouses	database	{"duration":475}
76811	2025-07-04 12:41:24.079341	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76822	2025-07-04 12:41:35.519848	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
72130	2025-07-04 11:50:56.999499	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
72138	2025-07-04 11:50:57.067413	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":193}
72146	2025-07-04 11:50:58.256879	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":81491},"duration":114}
72158	2025-07-04 11:50:59.708192	INFO	Performance: getDocuments	database	{"duration":41}
72160	2025-07-04 11:51:00.415747	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72182	2025-07-04 11:51:01.953376	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72246	2025-07-04 11:54:51.119476	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":170}
73261	2025-07-04 12:05:36.921896	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73267	2025-07-04 12:05:36.999013	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":84}
73276	2025-07-04 12:05:37.613332	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73290	2025-07-04 12:05:39.272355	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73304	2025-07-04 12:05:39.791843	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73307	2025-07-04 12:05:39.832162	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":48}
73321	2025-07-04 12:05:41.557375	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
73323	2025-07-04 12:05:43.035497	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73875	2025-07-04 12:11:38.440568	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73902	2025-07-04 12:11:57.823461	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73911	2025-07-04 12:12:09.95906	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73921	2025-07-04 12:12:11.420339	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
73931	2025-07-04 12:12:13.436689	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73945	2025-07-04 12:12:14.290579	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73975	2025-07-04 12:12:17.109826	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
75034	2025-07-04 12:24:59.441292	DEBUG	Starting: getContractors	database	\N
75044	2025-07-04 12:24:59.716392	INFO	Performance: getProducts	database	{"duration":530}
75059	2025-07-04 12:24:59.864094	INFO	Performance: getInventory	database	{"meta":{},"duration":828}
75068	2025-07-04 12:25:00.032669	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"984ms","forced":false}}
75070	2025-07-04 12:25:03.264372	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
75107	2025-07-04 12:25:18.996242	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75110	2025-07-04 12:25:19.070786	INFO	Retrieved all documents	api	{"meta":{"count":3,"entity":"Document"}}
75118	2025-07-04 12:25:19.929532	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631919905,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75136	2025-07-04 12:25:22.69838	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75140	2025-07-04 12:25:22.77179	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":13}}
75146	2025-07-04 12:25:23.554918	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75154	2025-07-04 12:25:23.594246	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631923574,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75160	2025-07-04 12:25:26.220035	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75175	2025-07-04 12:25:28.40041	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631928379,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75185	2025-07-04 12:25:30.867108	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75199	2025-07-04 12:25:35.611711	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631935590,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75439	2025-07-04 12:29:10.330684	INFO	Performance: getDocuments	database	{"duration":218}
75443	2025-07-04 12:29:17.854007	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632157831,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76772	2025-07-04 12:41:18.525303	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
76782	2025-07-04 12:41:18.563372	INFO	Performance: getContractors	database	{"duration":457}
76790	2025-07-04 12:41:18.619854	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76804	2025-07-04 12:41:18.834657	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
76816	2025-07-04 12:41:24.344622	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1040285},"duration":250}
76818	2025-07-04 12:41:34.292624	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76821	2025-07-04 12:41:35.518496	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76832	2025-07-04 12:41:37.146638	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76836	2025-07-04 12:41:37.220928	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76847	2025-07-04 12:41:38.993649	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76860	2025-07-04 12:41:41.653726	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77306	2025-07-04 12:46:25.304207	INFO	Performance: getDocuments	database	{"duration":196}
77310	2025-07-04 12:46:26.755038	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
77324	2025-07-04 12:46:33.471658	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77341	2025-07-04 12:46:35.125183	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1148144},"duration":247}
77342	2025-07-04 12:46:45.087561	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72131	2025-07-04 11:50:56.999281	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72145	2025-07-04 11:50:58.189174	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
72148	2025-07-04 11:50:59.667295	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72165	2025-07-04 11:51:00.419539	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72176	2025-07-04 11:51:01.952687	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72247	2025-07-04 11:54:53.164116	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":103502},"duration":2232}
73262	2025-07-04 12:05:36.922228	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73266	2025-07-04 12:05:36.99821	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73272	2025-07-04 12:05:37.612318	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73291	2025-07-04 12:05:39.275111	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73294	2025-07-04 12:05:39.358235	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73296	2025-07-04 12:05:39.786051	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73318	2025-07-04 12:05:41.51551	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73327	2025-07-04 12:05:43.037399	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
73344	2025-07-04 12:05:43.947623	DEBUG	Starting: getDocuments	database	\N
73358	2025-07-04 12:05:48.76241	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630748738,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73361	2025-07-04 12:05:48.841991	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73370	2025-07-04 12:06:02.345741	DEBUG	Starting: getDocuments	database	\N
73374	2025-07-04 12:06:02.430911	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73375	2025-07-04 12:06:20.287542	DEBUG	Starting: getDocuments	database	\N
73386	2025-07-04 12:06:20.370243	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":84}
73389	2025-07-04 12:06:34.536346	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73876	2025-07-04 12:11:38.444976	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73904	2025-07-04 12:11:57.824503	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631117802,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73914	2025-07-04 12:12:09.96025	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631129938,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73923	2025-07-04 12:12:11.456301	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":44}
73929	2025-07-04 12:12:12.047728	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631132026,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
73933	2025-07-04 12:12:13.437725	DEBUG	Starting: getDocuments	database	\N
73949	2025-07-04 12:12:14.291957	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73962	2025-07-04 12:12:15.533005	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73978	2025-07-04 12:12:17.147012	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
75040	2025-07-04 12:24:59.715114	INFO	Performance: getContractors	database	{"duration":531}
75045	2025-07-04 12:24:59.765587	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":397,"duration":"536ms","forced":false}}
75054	2025-07-04 12:24:59.862673	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":7}}
75064	2025-07-04 12:24:59.953802	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"981ms","forced":false}}
75076	2025-07-04 12:25:03.576773	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":682970},"duration":294}
75099	2025-07-04 12:25:13.456065	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
75101	2025-07-04 12:25:18.992255	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75119	2025-07-04 12:25:19.92977	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75128	2025-07-04 12:25:22.693003	DEBUG	Starting: getShipments	database	\N
75142	2025-07-04 12:25:22.801791	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75144	2025-07-04 12:25:23.55442	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75156	2025-07-04 12:25:26.218477	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75173	2025-07-04 12:25:28.398852	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75181	2025-07-04 12:25:30.865654	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75190	2025-07-04 12:25:30.904934	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631930887,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75201	2025-07-04 12:25:35.644912	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
75454	2025-07-04 12:29:52.80583	DEBUG	Starting: getDocuments	database	\N
75503	2025-07-04 12:29:57.273865	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75538	2025-07-04 12:30:02.085448	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":44}
75540	2025-07-04 12:30:02.259518	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75541	2025-07-04 12:30:02.298412	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
75543	2025-07-04 12:30:05.045669	INFO	DELETE /shipments/18	api	{"meta":{"method":"DELETE","url":"/shipments/18","bodySize":2}}
75545	2025-07-04 12:30:05.197144	INFO	Shipment deleted	database	{"meta":{"shipmentId":18}}
75550	2025-07-04 12:30:05.375735	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75560	2025-07-04 12:30:05.528356	INFO	Shipment deleted	database	{"meta":{"shipmentId":19}}
72132	2025-07-04 11:50:57.004626	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72143	2025-07-04 11:50:58.15496	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72154	2025-07-04 11:50:59.669536	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72167	2025-07-04 11:51:00.421253	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72170	2025-07-04 11:51:00.464293	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":44}
72173	2025-07-04 11:51:01.107026	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72183	2025-07-04 11:51:01.955192	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72186	2025-07-04 11:51:02.028309	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":70}
72248	2025-07-04 11:54:58.788153	DEBUG	Starting: getDocuments	database	\N
72249	2025-07-04 11:54:58.847709	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72257	2025-07-04 11:54:58.882848	DEBUG	Starting: getInventory	database	{"meta":{}}
72267	2025-07-04 11:54:58.917556	INFO	Performance: getContractors	database	{"duration":459}
72277	2025-07-04 11:54:58.970695	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"467ms","forced":false}}
72284	2025-07-04 11:54:59.175984	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72290	2025-07-04 11:55:00.954711	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72311	2025-07-04 11:55:22.877736	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73263	2025-07-04 12:05:36.923338	DEBUG	Starting: getDocuments	database	\N
73264	2025-07-04 12:05:36.996974	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73274	2025-07-04 12:05:37.612587	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73278	2025-07-04 12:05:37.650708	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630737632,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73288	2025-07-04 12:05:39.271652	DEBUG	Starting: getDocuments	database	\N
73292	2025-07-04 12:05:39.35777	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73305	2025-07-04 12:05:39.829662	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
73308	2025-07-04 12:05:40.894213	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73309	2025-07-04 12:05:40.971796	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
73315	2025-07-04 12:05:41.514769	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73325	2025-07-04 12:05:43.036153	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
73337	2025-07-04 12:05:43.108478	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73339	2025-07-04 12:05:43.946527	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73348	2025-07-04 12:05:44.01975	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73356	2025-07-04 12:05:48.75978	DEBUG	Starting: getDocuments	database	\N
73360	2025-07-04 12:05:48.841821	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73368	2025-07-04 12:06:02.341997	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73371	2025-07-04 12:06:02.430313	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":99}
73383	2025-07-04 12:06:20.366516	INFO	Performance: getDocuments	database	{"duration":82}
73387	2025-07-04 12:06:34.535136	DEBUG	Starting: getDocuments	database	\N
73877	2025-07-04 12:11:38.446161	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73879	2025-07-04 12:11:38.51758	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":201}
73906	2025-07-04 12:11:57.825486	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73915	2025-07-04 12:12:09.960894	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73917	2025-07-04 12:12:10.02848	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":72}
73925	2025-07-04 12:12:11.620312	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":446893},"duration":202}
73928	2025-07-04 12:12:12.047496	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73935	2025-07-04 12:12:13.438744	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73941	2025-07-04 12:12:13.516462	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73950	2025-07-04 12:12:14.2922	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73977	2025-07-04 12:12:17.111095	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631137088,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75077	2025-07-04 12:25:08.628227	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":8}}
75083	2025-07-04 12:25:09.026216	INFO	Performance: getInventory	database	{"meta":{},"duration":37}
75086	2025-07-04 12:25:09.226008	INFO	Shipment updated	database	{"meta":{"shipmentId":42,"updatedFields":["status"],"status":"shipped"}}
75088	2025-07-04 12:25:09.310459	INFO	Shipment created	database	{"meta":{"shipmentId":43,"orderId":2,"status":"draft"}}
75092	2025-07-04 12:25:09.473384	INFO	Shipment created	database	{"meta":{"shipmentId":46,"orderId":3,"status":"draft"}}
75094	2025-07-04 12:25:09.622054	INFO	Shipment deleted	database	{"meta":{"shipmentId":45}}
75096	2025-07-04 12:25:09.733586	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":44}}
75455	2025-07-04 12:29:52.812613	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75464	2025-07-04 12:29:52.891937	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":1049},"duration":205}
75466	2025-07-04 12:29:55.418292	INFO	POST /documents/delete-multiple	api	{"meta":{"method":"POST","url":"/documents/delete-multiple","bodySize":37}}
77309	2025-07-04 12:46:25.306139	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72134	2025-07-04 11:50:57.039868	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72140	2025-07-04 11:50:58.148805	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72147	2025-07-04 11:50:59.66689	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629859647,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72156	2025-07-04 11:50:59.707498	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72161	2025-07-04 11:51:00.41832	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72174	2025-07-04 11:51:01.952196	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629861930,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72185	2025-07-04 11:51:02.025619	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72250	2025-07-04 11:54:58.860541	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
72260	2025-07-04 11:54:58.897156	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72270	2025-07-04 11:54:58.933083	INFO	Performance: getWarehouses	database	{"duration":462}
72280	2025-07-04 11:54:58.973347	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"469ms","forced":false}}
73265	2025-07-04 12:05:36.997628	INFO	Performance: getDocuments	database	{"duration":82}
73271	2025-07-04 12:05:37.612125	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630737588,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73286	2025-07-04 12:05:39.270486	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73299	2025-07-04 12:05:39.789756	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73314	2025-07-04 12:05:41.514536	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73326	2025-07-04 12:05:43.036758	DEBUG	Starting: getShipments	database	\N
73343	2025-07-04 12:05:43.947216	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73355	2025-07-04 12:05:48.758759	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73366	2025-07-04 12:06:02.335193	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73380	2025-07-04 12:06:20.288444	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73393	2025-07-04 12:06:34.537317	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73396	2025-07-04 12:06:34.632963	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73878	2025-07-04 12:11:38.516332	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73903	2025-07-04 12:11:57.823894	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73912	2025-07-04 12:12:09.959908	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73922	2025-07-04 12:12:11.420876	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73927	2025-07-04 12:12:12.047295	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
73932	2025-07-04 12:12:13.437339	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73951	2025-07-04 12:12:14.329184	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
73961	2025-07-04 12:12:15.532267	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73971	2025-07-04 12:12:17.108481	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75078	2025-07-04 12:25:08.745243	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":8}}
75082	2025-07-04 12:25:09.024592	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":9}}
75456	2025-07-04 12:29:52.814646	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75465	2025-07-04 12:29:52.892153	INFO	Retrieved all documents	api	{"meta":{"count":5,"entity":"Document"}}
75493	2025-07-04 12:29:56.409409	INFO	Inventory cache invalidated after multiple document deletion	api	{"meta":{"deletedCount":5}}
75495	2025-07-04 12:29:56.652486	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75507	2025-07-04 12:29:57.274829	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75533	2025-07-04 12:30:02.050079	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75547	2025-07-04 12:30:05.198755	INFO	Shipment deleted	app	{"meta":{"shipmentId":18}}
75549	2025-07-04 12:30:05.371839	INFO	DELETE /shipments/19	api	{"meta":{"method":"DELETE","url":"/shipments/19","bodySize":2}}
75564	2025-07-04 12:30:05.710601	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75572	2025-07-04 12:30:05.790737	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":3140},"duration":82}
75575	2025-07-04 12:30:05.858347	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":22}}
75580	2025-07-04 12:30:06.091192	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75585	2025-07-04 12:30:06.167894	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":14}}
75588	2025-07-04 12:30:06.25751	INFO	Shipment deleted	app	{"meta":{"shipmentId":23}}
75592	2025-07-04 12:30:06.467312	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75599	2025-07-04 12:30:06.546302	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2664},"duration":82}
75602	2025-07-04 12:30:06.620233	INFO	Shipment deleted	app	{"meta":{"shipmentId":26}}
75611	2025-07-04 12:30:06.869719	INFO	Performance: getShipments	database	{"duration":74}
75618	2025-07-04 12:30:06.953415	INFO	Performance: DELETE /shipments/27	api	{"meta":{"statusCode":200,"responseSize":53},"duration":160}
75624	2025-07-04 12:30:07.211752	INFO	Performance: getShipments	database	{"duration":73}
75638	2025-07-04 12:30:07.538362	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":32,"itemsCount":0}}
75652	2025-07-04 12:30:07.862637	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":36,"itemsCount":0}}
77741	2025-07-04 13:41:55.659594	DEBUG	Starting: getDocuments	database	\N
72135	2025-07-04 11:50:57.042501	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72142	2025-07-04 11:50:58.14938	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72150	2025-07-04 11:50:59.667582	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72168	2025-07-04 11:51:00.461044	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":0}}
72178	2025-07-04 11:51:01.952944	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629861927,"responseTime":1,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72251	2025-07-04 11:54:58.863472	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
72262	2025-07-04 11:54:58.901639	DEBUG	Starting: getProducts	database	\N
72272	2025-07-04 11:54:58.937198	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"464ms","forced":false}}
72282	2025-07-04 11:54:58.973657	INFO	Performance: getInventory	database	{"meta":{},"duration":482}
72293	2025-07-04 11:55:00.957241	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72305	2025-07-04 11:55:03.035894	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":114818},"duration":108}
72307	2025-07-04 11:55:13.221588	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72309	2025-07-04 11:55:22.873072	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
73268	2025-07-04 12:05:37.039857	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73273	2025-07-04 12:05:37.612459	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73289	2025-07-04 12:05:39.271914	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630739250,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73293	2025-07-04 12:05:39.358098	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":87}
73302	2025-07-04 12:05:39.790647	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73316	2025-07-04 12:05:41.514993	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73324	2025-07-04 12:05:43.036045	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
73331	2025-07-04 12:05:43.070753	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
73336	2025-07-04 12:05:43.107853	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
73341	2025-07-04 12:05:43.946917	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630743924,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73349	2025-07-04 12:05:44.020766	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":72}
73352	2025-07-04 12:05:48.757397	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73369	2025-07-04 12:06:02.345513	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630762314,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73372	2025-07-04 12:06:02.430702	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73376	2025-07-04 12:06:20.28788	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73384	2025-07-04 12:06:20.366863	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73388	2025-07-04 12:06:34.535469	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73880	2025-07-04 12:11:54.684444	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":42}}
73886	2025-07-04 12:11:54.706988	INFO	Performance: getWarehouses	database	{"duration":173}
73894	2025-07-04 12:11:54.73074	INFO	Performance: getProducts	database	{"duration":185}
75079	2025-07-04 12:25:08.746956	INFO	Performance: getInventory	database	{"meta":{},"duration":64}
75080	2025-07-04 12:25:08.981862	INFO	Shipment created	database	{"meta":{"shipmentId":41,"orderId":1,"status":"shipped"}}
75457	2025-07-04 12:29:52.818639	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75463	2025-07-04 12:29:52.891151	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":5}}
75471	2025-07-04 12:29:55.590656	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":300}}
75472	2025-07-04 12:29:55.664855	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":303,"service":"transaction"}}
75473	2025-07-04 12:29:55.714439	DEBUG	Удалены записи inventory	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75476	2025-07-04 12:29:55.787775	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":303}}
75477	2025-07-04 12:29:55.859873	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":304,"service":"transaction"}}
75478	2025-07-04 12:29:55.90886	DEBUG	Удалены записи inventory	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75481	2025-07-04 12:29:55.980713	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
75482	2025-07-04 12:29:56.053146	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":301,"service":"transaction"}}
75483	2025-07-04 12:29:56.10481	DEBUG	Удалены записи inventory	app	{"meta":{"deletedCount":0,"service":"transaction"}}
75486	2025-07-04 12:29:56.178649	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
75487	2025-07-04 12:29:56.251068	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":302,"service":"transaction"}}
75488	2025-07-04 12:29:56.299079	DEBUG	Удалены записи inventory	app	{"meta":{"deletedCount":0,"service":"transaction"}}
75491	2025-07-04 12:29:56.371903	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
75496	2025-07-04 12:29:56.653475	DEBUG	Starting: getDocuments	database	\N
75508	2025-07-04 12:29:57.275897	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75512	2025-07-04 12:29:57.316767	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":2}}
75520	2025-07-04 12:30:01.349129	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":90,"itemsCount":1}}
78003	2025-07-04 14:20:23.416818	DEBUG	Starting: getDocuments	database	\N
72136	2025-07-04 11:50:57.04312	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72141	2025-07-04 11:50:58.149233	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":494},"duration":1}
72151	2025-07-04 11:50:59.668443	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72163	2025-07-04 11:51:00.419043	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72175	2025-07-04 11:51:01.952529	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72252	2025-07-04 11:54:58.863894	DEBUG	Starting: getWarehouses	database	\N
72261	2025-07-04 11:54:58.901433	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":25385}}
72271	2025-07-04 11:54:58.936348	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
72278	2025-07-04 11:54:58.972236	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72287	2025-07-04 11:54:59.177292	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":163,"duration":"489ms","forced":false}}
72297	2025-07-04 11:55:01.074148	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":112856},"duration":119}
72298	2025-07-04 11:55:02.92262	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72313	2025-07-04 11:55:22.879423	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73280	2025-07-04 12:05:37.735726	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73283	2025-07-04 12:05:38.246626	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73295	2025-07-04 12:05:39.359245	INFO	Performance: getDocuments	database	{"duration":84}
73297	2025-07-04 12:05:39.78638	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73319	2025-07-04 12:05:41.515889	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73320	2025-07-04 12:05:41.556929	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":44}
73332	2025-07-04 12:05:43.072348	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73346	2025-07-04 12:05:43.948695	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73350	2025-07-04 12:05:44.021693	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73362	2025-07-04 12:05:48.842127	INFO	Performance: getDocuments	database	{"duration":83}
73373	2025-07-04 12:06:02.43101	INFO	Performance: getDocuments	database	{"duration":97}
73382	2025-07-04 12:06:20.294423	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73385	2025-07-04 12:06:20.370085	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73398	2025-07-04 12:06:34.63655	INFO	Performance: getDocuments	database	{"duration":93}
73881	2025-07-04 12:11:54.683248	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
73887	2025-07-04 12:11:54.708445	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
73895	2025-07-04 12:11:54.731165	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
75081	2025-07-04 12:25:08.982093	INFO	Shipment items created	database	{"meta":{"shipmentId":41,"itemsCount":1}}
75458	2025-07-04 12:29:52.843715	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632192657,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75509	2025-07-04 12:29:57.313837	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":0}}
75534	2025-07-04 12:30:02.050376	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632202028,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75551	2025-07-04 12:30:05.378701	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75556	2025-07-04 12:30:05.453719	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":3378},"duration":79}
75567	2025-07-04 12:30:05.713345	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75573	2025-07-04 12:30:05.855184	INFO	Shipment deleted	database	{"meta":{"shipmentId":22}}
75581	2025-07-04 12:30:06.15429	DEBUG	Starting: getShipments	database	\N
75594	2025-07-04 12:30:06.468338	INFO	DELETE /shipments/26	api	{"meta":{"method":"DELETE","url":"/shipments/26","bodySize":2}}
75601	2025-07-04 12:30:06.619544	INFO	Shipment deleted	database	{"meta":{"shipmentId":26}}
75606	2025-07-04 12:30:06.802824	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75610	2025-07-04 12:30:06.869292	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2471},"duration":76}
75622	2025-07-04 12:30:07.137709	DEBUG	Starting: getShipments	database	\N
75625	2025-07-04 12:30:07.217881	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":11}}
75630	2025-07-04 12:30:07.290377	INFO	Performance: DELETE /shipments/31	api	{"meta":{"statusCode":200,"responseSize":53},"duration":156}
75635	2025-07-04 12:30:07.46682	DEBUG	Starting: getShipments	database	\N
75640	2025-07-04 12:30:07.551314	INFO	Retrieved all shipments	app	{"meta":{"count":10,"entity":"Shipment"}}
75649	2025-07-04 12:30:07.790107	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75653	2025-07-04 12:30:07.868783	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":9}}
75657	2025-07-04 12:30:07.946489	INFO	Performance: DELETE /shipments/36	api	{"meta":{"statusCode":200,"responseSize":53},"duration":156}
75661	2025-07-04 12:30:08.186608	DEBUG	Starting: getShipments	database	\N
75669	2025-07-04 12:30:08.276623	INFO	Retrieved all shipments	app	{"meta":{"count":8,"entity":"Shipment"}}
75671	2025-07-04 12:30:08.333431	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":37}}
75679	2025-07-04 12:30:08.5491	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75681	2025-07-04 12:30:08.626047	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":7}}
75691	2025-07-04 12:30:08.885295	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
72187	2025-07-04 11:51:34.293514	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72188	2025-07-04 11:51:34.331549	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":155}
72190	2025-07-04 11:51:34.75527	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72191	2025-07-04 11:51:34.798568	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72193	2025-07-04 11:51:34.834721	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72211	2025-07-04 11:51:35.851163	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72215	2025-07-04 11:51:35.890153	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629895871,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72221	2025-07-04 11:51:46.158501	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72253	2025-07-04 11:54:58.865799	DEBUG	Starting: getContractors	database	\N
72263	2025-07-04 11:54:58.90209	INFO	Получение всех отгрузок	app	{"meta":{}}
72273	2025-07-04 11:54:58.937356	INFO	Performance: getDocuments	database	{"duration":459}
72281	2025-07-04 11:54:58.973488	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
72294	2025-07-04 11:55:00.957409	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72300	2025-07-04 11:55:02.924118	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72314	2025-07-04 11:55:22.915802	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
73882	2025-07-04 12:11:54.691518	INFO	Performance: getSuppliers	database	{"duration":161}
73888	2025-07-04 12:11:54.714774	INFO	Performance: getInventory	database	{"meta":{},"duration":175}
73896	2025-07-04 12:11:54.737202	INFO	Performance: getInventory	database	{"meta":{},"duration":185}
75084	2025-07-04 12:25:09.146984	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":9}}
75090	2025-07-04 12:25:09.394964	INFO	Shipment created	database	{"meta":{"shipmentId":44,"orderId":1,"status":"draft"}}
75098	2025-07-04 12:25:09.809658	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":46}}
75459	2025-07-04 12:29:52.850342	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75500	2025-07-04 12:29:56.692271	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
75506	2025-07-04 12:29:57.274569	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632197250,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75511	2025-07-04 12:29:57.316855	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632197296,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75514	2025-07-04 12:29:58.303221	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75515	2025-07-04 12:29:58.400211	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":553},"duration":77}
75517	2025-07-04 12:30:01.191687	INFO	POST /orders/delete-multiple	api	{"meta":{"method":"POST","url":"/orders/delete-multiple","bodySize":20}}
75518	2025-07-04 12:30:01.268372	DEBUG	Retrieved order by ID	api	{"meta":{"id":90,"found":true,"entity":"Order"}}
75522	2025-07-04 12:30:01.487442	INFO	Deleted order	api	{"meta":{"id":90,"entity":"Order"}}
75526	2025-07-04 12:30:01.646677	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":91,"itemsCount":0}}
75529	2025-07-04 12:30:01.78146	INFO	Inventory cache invalidated after order deletion	api	{"meta":{"orderId":91}}
75536	2025-07-04 12:30:02.050723	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75552	2025-07-04 12:30:05.378933	DEBUG	Starting: getShipments	database	\N
75555	2025-07-04 12:30:05.45347	INFO	Retrieved all shipments	app	{"meta":{"count":16,"entity":"Shipment"}}
75559	2025-07-04 12:30:05.528025	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":19}}
75569	2025-07-04 12:30:05.789517	INFO	Performance: getShipments	database	{"duration":80}
75577	2025-07-04 12:30:06.090361	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75583	2025-07-04 12:30:06.167464	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2903},"duration":79}
75596	2025-07-04 12:30:06.544618	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":26,"itemsCount":0}}
75608	2025-07-04 12:30:06.803196	DEBUG	Starting: getShipments	database	\N
75613	2025-07-04 12:30:06.870414	INFO	Retrieved all shipments	app	{"meta":{"count":12,"entity":"Shipment"}}
75619	2025-07-04 12:30:07.137193	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75626	2025-07-04 12:30:07.218111	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2278},"duration":75}
75636	2025-07-04 12:30:07.467403	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75643	2025-07-04 12:30:07.614945	INFO	Shipment deleted	database	{"meta":{"shipmentId":32}}
75648	2025-07-04 12:30:07.789956	DEBUG	Starting: getShipments	database	\N
75654	2025-07-04 12:30:07.868986	INFO	Retrieved all shipments	app	{"meta":{"count":9,"entity":"Shipment"}}
75662	2025-07-04 12:30:08.186944	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75678	2025-07-04 12:30:08.548958	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75682	2025-07-04 12:30:08.626444	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1506},"duration":77}
75685	2025-07-04 12:30:08.706912	INFO	Performance: DELETE /shipments/41	api	{"meta":{"statusCode":200,"responseSize":53},"duration":165}
75690	2025-07-04 12:30:08.885162	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75705	2025-07-04 12:30:09.24681	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75709	2025-07-04 12:30:09.32805	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":5}}
75717	2025-07-04 12:30:09.571079	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75730	2025-07-04 12:30:11.649202	DEBUG	Starting: getShipments	database	\N
75750	2025-07-04 12:30:12.056928	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":49,"itemsCount":0}}
75763	2025-07-04 12:30:12.388371	DEBUG	Starting: getShipments	database	\N
72189	2025-07-04 11:51:34.332208	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72192	2025-07-04 11:51:34.799275	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":1}
72194	2025-07-04 11:51:34.837154	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":49}
72210	2025-07-04 11:51:35.850837	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72216	2025-07-04 11:51:35.890834	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72219	2025-07-04 11:51:46.155487	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629906126,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72254	2025-07-04 11:54:58.868819	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
72265	2025-07-04 11:54:58.906916	INFO	Performance: getSuppliers	database	{"duration":456}
72274	2025-07-04 11:54:58.947539	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":2,"duration":"466ms","forced":false}}
72286	2025-07-04 11:54:59.177014	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":163,"duration":"487ms","forced":false}}
72291	2025-07-04 11:55:00.956856	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72301	2025-07-04 11:55:02.927595	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72304	2025-07-04 11:55:02.97085	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72310	2025-07-04 11:55:22.876979	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73883	2025-07-04 12:11:54.70389	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
73891	2025-07-04 12:11:54.726665	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"178ms","forced":false}}
75085	2025-07-04 12:25:09.185233	INFO	Shipment created	database	{"meta":{"shipmentId":42,"orderId":1,"status":"draft"}}
75087	2025-07-04 12:25:09.268255	INFO	Shipment updated	database	{"meta":{"shipmentId":42,"updatedFields":["status"],"status":"delivered"}}
75089	2025-07-04 12:25:09.348052	INFO	Shipment updated	database	{"meta":{"shipmentId":43,"updatedFields":["status"],"status":"cancelled"}}
75091	2025-07-04 12:25:09.431772	INFO	Shipment created	database	{"meta":{"shipmentId":45,"orderId":2,"status":"draft"}}
75093	2025-07-04 12:25:09.544558	INFO	Shipment deleted	database	{"meta":{"shipmentId":44}}
75095	2025-07-04 12:25:09.692699	INFO	Shipment deleted	database	{"meta":{"shipmentId":46}}
75097	2025-07-04 12:25:09.768597	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":45}}
75460	2025-07-04 12:29:52.849119	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75499	2025-07-04 12:29:56.692059	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
75505	2025-07-04 12:29:57.274386	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75510	2025-07-04 12:29:57.314733	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
75528	2025-07-04 12:30:01.781542	INFO	Performance: POST /orders/delete-multiple	api	{"meta":{"statusCode":200,"responseSize":88},"duration":590}
75535	2025-07-04 12:30:02.050555	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75553	2025-07-04 12:30:05.379101	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75554	2025-07-04 12:30:05.453204	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":16}}
75566	2025-07-04 12:30:05.7132	DEBUG	Starting: getShipments	database	\N
75571	2025-07-04 12:30:05.790407	INFO	Retrieved all shipments	app	{"meta":{"count":15,"entity":"Shipment"}}
75574	2025-07-04 12:30:05.856862	INFO	Performance: DELETE /shipments/22	api	{"meta":{"statusCode":200,"responseSize":53},"duration":151}
75578	2025-07-04 12:30:06.090175	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75733	2025-07-04 12:30:11.650428	INFO	DELETE /shipments/48	api	{"meta":{"method":"DELETE","url":"/shipments/48","bodySize":2}}
75737	2025-07-04 12:30:11.723741	INFO	Retrieved all shipments	app	{"meta":{"count":3,"entity":"Shipment"}}
75789	2025-07-04 12:30:13.22893	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632213207,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75802	2025-07-04 12:30:14.120496	INFO	Performance: getDocuments	database	{"duration":38}
75814	2025-07-04 12:30:14.691031	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":0}}
75822	2025-07-04 12:30:15.855558	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75834	2025-07-04 12:30:16.412167	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75843	2025-07-04 12:30:30.028227	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76773	2025-07-04 12:41:18.527414	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
76783	2025-07-04 12:41:18.566865	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
76791	2025-07-04 12:41:18.620834	INFO	Performance: getInventory	database	{"meta":{},"duration":465}
76796	2025-07-04 12:41:18.832811	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"476ms","forced":false}}
76807	2025-07-04 12:41:18.871617	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":624,"duration":"775ms","forced":false}}
76809	2025-07-04 12:41:24.074649	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76824	2025-07-04 12:41:35.520218	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76827	2025-07-04 12:41:37.145056	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76839	2025-07-04 12:41:38.991643	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76849	2025-07-04 12:41:39.031534	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":46}
76851	2025-07-04 12:41:40.22582	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72195	2025-07-04 11:51:34.885703	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629894732,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72217	2025-07-04 11:51:35.967604	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72220	2025-07-04 11:51:46.155646	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72255	2025-07-04 11:54:58.869536	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
72264	2025-07-04 11:54:58.906689	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
72275	2025-07-04 11:54:58.949303	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72289	2025-07-04 11:54:59.181672	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
72295	2025-07-04 11:55:00.9578	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":6}
72302	2025-07-04 11:55:02.963066	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
72312	2025-07-04 11:55:22.878463	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
73884	2025-07-04 12:11:54.704363	INFO	Performance: getContractors	database	{"duration":170}
73893	2025-07-04 12:11:54.728572	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"186ms","forced":false}}
75461	2025-07-04 12:29:52.858818	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75498	2025-07-04 12:29:56.691592	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
75504	2025-07-04 12:29:57.27418	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75537	2025-07-04 12:30:02.050846	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75548	2025-07-04 12:30:05.199535	INFO	Performance: DELETE /shipments/18	api	{"meta":{"statusCode":200,"responseSize":53},"duration":154}
75558	2025-07-04 12:30:05.45529	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":19,"itemsCount":1}}
75561	2025-07-04 12:30:05.530649	INFO	Shipment deleted	app	{"meta":{"shipmentId":19}}
75565	2025-07-04 12:30:05.712581	INFO	DELETE /shipments/22	api	{"meta":{"method":"DELETE","url":"/shipments/22","bodySize":2}}
75570	2025-07-04 12:30:05.789744	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":15}}
75576	2025-07-04 12:30:05.858514	INFO	Shipment deleted	app	{"meta":{"shipmentId":22}}
75582	2025-07-04 12:30:06.166855	INFO	Performance: getShipments	database	{"duration":77}
75593	2025-07-04 12:30:06.467733	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75597	2025-07-04 12:30:06.545129	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":13}}
75607	2025-07-04 12:30:06.803051	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75612	2025-07-04 12:30:06.870252	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":12}}
75616	2025-07-04 12:30:06.95302	INFO	Shipment deleted	app	{"meta":{"shipmentId":27}}
75628	2025-07-04 12:30:07.218984	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":31,"itemsCount":0}}
75629	2025-07-04 12:30:07.290025	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":31}}
75637	2025-07-04 12:30:07.467571	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75639	2025-07-04 12:30:07.550984	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":10}}
75645	2025-07-04 12:30:07.617245	INFO	Performance: DELETE /shipments/32	api	{"meta":{"statusCode":200,"responseSize":53},"duration":151}
75651	2025-07-04 12:30:07.794023	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75659	2025-07-04 12:30:07.94711	INFO	Shipment deleted	database	{"meta":{"shipmentId":36}}
75668	2025-07-04 12:30:08.276279	INFO	Performance: getShipments	database	{"duration":85}
75673	2025-07-04 12:30:08.336119	INFO	Performance: DELETE /shipments/37	api	{"meta":{"statusCode":200,"responseSize":53},"duration":147}
75684	2025-07-04 12:30:08.634154	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":41,"itemsCount":1}}
75686	2025-07-04 12:30:08.70799	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":41}}
75689	2025-07-04 12:30:08.884799	INFO	DELETE /shipments/42	api	{"meta":{"method":"DELETE","url":"/shipments/42","bodySize":2}}
75697	2025-07-04 12:30:08.963715	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1262},"duration":78}
75700	2025-07-04 12:30:09.036508	INFO	Shipment deleted	app	{"meta":{"shipmentId":42}}
75703	2025-07-04 12:30:09.245867	INFO	DELETE /shipments/43	api	{"meta":{"method":"DELETE","url":"/shipments/43","bodySize":2}}
75712	2025-07-04 12:30:09.329842	INFO	Retrieved all shipments	app	{"meta":{"count":5,"entity":"Shipment"}}
75714	2025-07-04 12:30:09.400456	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":43}}
75721	2025-07-04 12:30:09.64588	INFO	Performance: getShipments	database	{"duration":74}
75729	2025-07-04 12:30:11.474779	INFO	Performance: DELETE /shipments/47	api	{"meta":{"statusCode":200,"responseSize":53},"duration":149}
75738	2025-07-04 12:30:11.723917	INFO	Performance: getShipments	database	{"duration":74}
75743	2025-07-04 12:30:11.801203	INFO	Performance: DELETE /shipments/48	api	{"meta":{"statusCode":200,"responseSize":53},"duration":150}
75752	2025-07-04 12:30:12.057687	INFO	Performance: getShipments	database	{"duration":79}
75758	2025-07-04 12:30:12.147822	INFO	Performance: DELETE /shipments/49	api	{"meta":{"statusCode":200,"responseSize":53},"duration":163}
75768	2025-07-04 12:30:12.462774	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":50,"itemsCount":0}}
75771	2025-07-04 12:30:12.537438	INFO	Shipment deleted	app	{"meta":{"shipmentId":50}}
75774	2025-07-04 12:30:12.711951	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75777	2025-07-04 12:30:12.749836	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
75782	2025-07-04 12:30:13.227413	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72196	2025-07-04 11:51:34.886434	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72207	2025-07-04 11:51:35.850292	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72222	2025-07-04 11:51:46.158788	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72256	2025-07-04 11:54:58.870767	DEBUG	Starting: getSuppliers	database	\N
72266	2025-07-04 11:54:58.909021	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"460ms","forced":false}}
72276	2025-07-04 11:54:58.950178	INFO	Performance: getProducts	database	{"duration":467}
72288	2025-07-04 11:54:59.178474	INFO	Performance: getInventory	database	{"meta":{},"duration":483}
72292	2025-07-04 11:55:00.95708	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72315	2025-07-04 11:55:23.002887	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":117340},"duration":120}
73885	2025-07-04 12:11:54.704712	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"172ms","forced":false}}
73892	2025-07-04 12:11:54.727164	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
73899	2025-07-04 12:11:54.748341	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"190ms","forced":false}}
75462	2025-07-04 12:29:52.8905	INFO	Performance: getDocuments	database	{"duration":199}
75469	2025-07-04 12:29:55.552202	DEBUG	Удалены позиции документа	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75480	2025-07-04 12:29:55.979233	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":304}}
75484	2025-07-04 12:29:56.138628	DEBUG	Удалены позиции документа	app	{"meta":{"deletedCount":0,"service":"transaction"}}
75490	2025-07-04 12:29:56.370224	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":302}}
75492	2025-07-04 12:29:56.409091	INFO	Performance: POST /documents/delete-multiple	api	{"meta":{"statusCode":200,"responseSize":180},"duration":991}
75497	2025-07-04 12:29:56.689737	INFO	Performance: getDocuments	database	{"duration":37}
75501	2025-07-04 12:29:57.270274	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75786	2025-07-04 12:30:13.228388	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75807	2025-07-04 12:30:14.652365	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75823	2025-07-04 12:30:15.85587	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75828	2025-07-04 12:30:16.408296	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75845	2025-07-04 12:30:30.02854	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
76774	2025-07-04 12:41:18.530955	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
76784	2025-07-04 12:41:18.569615	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"461ms","forced":false}}
76792	2025-07-04 12:41:18.621083	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76802	2025-07-04 12:41:18.834062	INFO	Performance: getDocuments	database	{"duration":559}
76813	2025-07-04 12:41:24.080083	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76823	2025-07-04 12:41:35.52006	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76834	2025-07-04 12:41:37.147085	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76835	2025-07-04 12:41:37.220528	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76844	2025-07-04 12:41:38.993076	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76850	2025-07-04 12:41:39.032775	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632899012,"responseTime":46,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76853	2025-07-04 12:41:40.264482	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76854	2025-07-04 12:41:41.650354	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76865	2025-07-04 12:41:41.688281	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76869	2025-07-04 12:41:41.737699	INFO	Retrieved all shipments	app	{"meta":{"count":3,"entity":"Shipment"}}
76871	2025-07-04 12:41:42.344954	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76873	2025-07-04 12:42:00.354633	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76878	2025-07-04 12:42:18.288912	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76879	2025-07-04 12:42:21.905332	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76884	2025-07-04 12:42:35.311425	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":43}
77315	2025-07-04 12:46:26.759778	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77321	2025-07-04 12:46:33.466933	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77326	2025-07-04 12:46:33.503289	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
77332	2025-07-04 12:46:33.548826	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":624},"duration":79}
77335	2025-07-04 12:46:34.849148	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77350	2025-07-04 12:46:59.072537	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":604},"duration":1}
77355	2025-07-04 12:47:04.20782	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77366	2025-07-04 12:47:11.078993	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633231055,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77379	2025-07-04 12:47:11.772787	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77670	2025-07-04 12:58:57.11337	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77721	2025-07-04 13:20:53.120751	INFO	Performance: getSuppliers	database	{"duration":627}
72197	2025-07-04 11:51:34.886958	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72206	2025-07-04 11:51:35.849988	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72223	2025-07-04 11:51:46.15924	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72228	2025-07-04 11:51:46.198412	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629906179,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72258	2025-07-04 11:54:58.888557	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
72269	2025-07-04 11:54:58.926258	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
72283	2025-07-04 11:54:58.973811	INFO	Все отгрузки получены	app	{"meta":{"count":0}}
73889	2025-07-04 12:11:54.715684	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"175ms","forced":false}}
73897	2025-07-04 12:11:54.738532	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
75467	2025-07-04 12:29:55.455479	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":300,"service":"transaction"}}
75468	2025-07-04 12:29:55.515464	DEBUG	Удалены записи inventory	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75470	2025-07-04 12:29:55.588876	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
75474	2025-07-04 12:29:55.748872	DEBUG	Удалены позиции документа	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75475	2025-07-04 12:29:55.785096	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
75479	2025-07-04 12:29:55.943047	DEBUG	Удалены позиции документа	app	{"meta":{"deletedCount":1,"service":"transaction"}}
75485	2025-07-04 12:29:56.177121	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":301}}
75489	2025-07-04 12:29:56.334212	DEBUG	Удалены позиции документа	app	{"meta":{"deletedCount":0,"service":"transaction"}}
75494	2025-07-04 12:29:56.651982	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75502	2025-07-04 12:29:57.273336	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75784	2025-07-04 12:30:13.227577	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75795	2025-07-04 12:30:14.081616	DEBUG	Starting: getDocuments	database	\N
75801	2025-07-04 12:30:14.120141	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
75805	2025-07-04 12:30:14.651773	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75833	2025-07-04 12:30:16.411809	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75838	2025-07-04 12:30:16.451802	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
75840	2025-07-04 12:30:30.025499	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75850	2025-07-04 12:30:30.064133	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632230046,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76775	2025-07-04 12:41:18.531521	DEBUG	Starting: getContractors	database	\N
76793	2025-07-04 12:41:18.621319	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"470ms","forced":false}}
76803	2025-07-04 12:41:18.834308	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76812	2025-07-04 12:41:24.07992	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76820	2025-07-04 12:41:35.517163	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76833	2025-07-04 12:41:37.146911	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632897125,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76838	2025-07-04 12:41:37.22464	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":79}
76846	2025-07-04 12:41:38.993402	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76867	2025-07-04 12:41:41.73682	INFO	Performance: getShipments	database	{"duration":82}
76872	2025-07-04 12:41:42.3463	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":37}
76875	2025-07-04 12:42:00.392953	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76877	2025-07-04 12:42:18.28856	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76881	2025-07-04 12:42:21.943844	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76883	2025-07-04 12:42:35.265916	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77317	2025-07-04 12:46:27.051302	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1143006},"duration":287}
77322	2025-07-04 12:46:33.467084	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77672	2025-07-04 12:58:57.112623	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77683	2025-07-04 13:00:53.786383	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":42}}
77696	2025-07-04 13:01:12.236296	INFO	Performance: getProducts	database	{"duration":21320}
77698	2025-07-04 13:04:05.827027	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
77706	2025-07-04 13:04:09.427834	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77707	2025-07-04 13:04:10.624637	INFO	Performance: getContractors	database	{"duration":15301}
77715	2025-07-04 13:04:11.326231	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"15999ms","forced":false}}
77723	2025-07-04 13:20:53.146531	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"629ms","forced":false}}
77731	2025-07-04 13:20:53.625	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"1132ms","forced":false}}
72198	2025-07-04 11:51:34.887419	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72214	2025-07-04 11:51:35.88814	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":0}}
72225	2025-07-04 11:51:46.16043	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72229	2025-07-04 11:51:46.205773	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
72259	2025-07-04 11:54:58.889046	DEBUG	Starting: getInventory	database	{"meta":{}}
72268	2025-07-04 11:54:58.9254	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"462ms","forced":false}}
72279	2025-07-04 11:54:58.972385	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"468ms","forced":false}}
72285	2025-07-04 11:54:59.176765	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"489ms","forced":false}}
72296	2025-07-04 11:55:00.993405	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
72299	2025-07-04 11:55:02.922936	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
72303	2025-07-04 11:55:02.970621	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72306	2025-07-04 11:55:13.221294	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72308	2025-07-04 11:55:22.872413	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73890	2025-07-04 12:11:54.716597	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
73898	2025-07-04 12:11:54.741626	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"188ms","forced":false}}
75513	2025-07-04 12:29:57.416523	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75516	2025-07-04 12:29:58.400698	INFO	Retrieved all orders	api	{"meta":{"count":2,"entity":"Order"}}
75519	2025-07-04 12:30:01.270281	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":90,"itemsCount":1}}
75521	2025-07-04 12:30:01.34954	DEBUG	Retrieved order by ID	api	{"meta":{"id":90,"found":true,"entity":"Order"}}
75523	2025-07-04 12:30:01.487847	INFO	Inventory cache invalidated after order deletion	api	{"meta":{"orderId":90}}
75524	2025-07-04 12:30:01.567239	DEBUG	Retrieved order by ID	api	{"meta":{"id":91,"found":true,"entity":"Order"}}
75530	2025-07-04 12:30:01.78204	INFO	Deleted order	api	{"meta":{"id":91,"entity":"Order"}}
75532	2025-07-04 12:30:02.042649	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75590	2025-07-04 12:30:06.25905	INFO	Shipment deleted	database	{"meta":{"shipmentId":23}}
75598	2025-07-04 12:30:06.546207	INFO	Performance: getShipments	database	{"duration":80}
75603	2025-07-04 12:30:06.621033	INFO	Performance: DELETE /shipments/26	api	{"meta":{"statusCode":200,"responseSize":53},"duration":152}
75609	2025-07-04 12:30:06.803319	INFO	DELETE /shipments/27	api	{"meta":{"method":"DELETE","url":"/shipments/27","bodySize":2}}
75615	2025-07-04 12:30:06.952675	INFO	Shipment deleted	database	{"meta":{"shipmentId":27}}
75621	2025-07-04 12:30:07.137474	INFO	DELETE /shipments/31	api	{"meta":{"method":"DELETE","url":"/shipments/31","bodySize":2}}
75627	2025-07-04 12:30:07.218787	INFO	Retrieved all shipments	app	{"meta":{"count":11,"entity":"Shipment"}}
75632	2025-07-04 12:30:07.29133	INFO	Shipment deleted	app	{"meta":{"shipmentId":31}}
75641	2025-07-04 12:30:07.552163	INFO	Performance: getShipments	database	{"duration":86}
75646	2025-07-04 12:30:07.618203	INFO	Shipment deleted	app	{"meta":{"shipmentId":32}}
75656	2025-07-04 12:30:07.869956	INFO	Performance: getShipments	database	{"duration":80}
75660	2025-07-04 12:30:07.947613	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":36}}
75663	2025-07-04 12:30:08.187185	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75670	2025-07-04 12:30:08.277266	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1699},"duration":89}
75674	2025-07-04 12:30:08.336292	INFO	Shipment deleted	app	{"meta":{"shipmentId":37}}
75677	2025-07-04 12:30:08.54872	INFO	DELETE /shipments/41	api	{"meta":{"method":"DELETE","url":"/shipments/41","bodySize":2}}
75683	2025-07-04 12:30:08.62665	INFO	Retrieved all shipments	app	{"meta":{"count":7,"entity":"Shipment"}}
75688	2025-07-04 12:30:08.708595	INFO	Shipment deleted	app	{"meta":{"shipmentId":41}}
75695	2025-07-04 12:30:08.963138	INFO	Performance: getShipments	database	{"duration":77}
75707	2025-07-04 12:30:09.247641	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75715	2025-07-04 12:30:09.400656	INFO	Shipment deleted	database	{"meta":{"shipmentId":43}}
75719	2025-07-04 12:30:09.571815	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75724	2025-07-04 12:30:09.647925	INFO	Retrieved all shipments	app	{"meta":{"count":4,"entity":"Shipment"}}
75726	2025-07-04 12:30:11.396928	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":47,"itemsCount":1}}
75744	2025-07-04 12:30:11.833006	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":47}}
75746	2025-07-04 12:30:11.978127	INFO	DELETE /shipments/49	api	{"meta":{"method":"DELETE","url":"/shipments/49","bodySize":2}}
75753	2025-07-04 12:30:12.058314	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":387},"duration":81}
75757	2025-07-04 12:30:12.146325	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":49}}
75762	2025-07-04 12:30:12.388242	INFO	DELETE /shipments/50	api	{"meta":{"method":"DELETE","url":"/shipments/50","bodySize":2}}
75767	2025-07-04 12:30:12.46223	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":194},"duration":77}
75776	2025-07-04 12:30:12.712398	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75780	2025-07-04 12:30:12.75237	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
75783	2025-07-04 12:30:13.22792	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75792	2025-07-04 12:30:13.265506	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632213246,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75798	2025-07-04 12:30:14.082054	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72199	2025-07-04 11:51:34.887999	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72208	2025-07-04 11:51:35.849894	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72227	2025-07-04 11:51:46.197781	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":0}}
72316	2025-07-04 11:55:33.143737	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72318	2025-07-04 11:55:43.3372	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
72320	2025-07-04 11:55:53.585422	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72321	2025-07-04 11:55:53.630605	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72330	2025-07-04 11:56:19.185502	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":0}}
72356	2025-07-04 11:56:21.941958	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":2}
72362	2025-07-04 11:56:21.976626	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72369	2025-07-04 11:56:23.703565	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630183680,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72386	2025-07-04 11:56:24.24215	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72392	2025-07-04 11:56:49.340137	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72404	2025-07-04 11:56:52.466905	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72419	2025-07-04 11:56:59.81974	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72437	2025-07-04 11:57:04.398217	INFO	Performance: getDocuments	database	{"duration":38}
72441	2025-07-04 11:57:09.704073	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630229683,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72453	2025-07-04 11:57:19.918161	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72467	2025-07-04 11:57:27.038849	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72480	2025-07-04 11:57:30.317727	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
73900	2025-07-04 12:11:54.762759	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"163ms","forced":false}}
75525	2025-07-04 12:30:01.567627	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":91,"itemsCount":0}}
75527	2025-07-04 12:30:01.647035	DEBUG	Retrieved order by ID	api	{"meta":{"id":91,"found":true,"entity":"Order"}}
75531	2025-07-04 12:30:01.782226	INFO	Inventory cache invalidated after multiple order deletion	api	{"meta":{"deletedCount":2}}
75539	2025-07-04 12:30:02.086794	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
75542	2025-07-04 12:30:02.299791	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
75544	2025-07-04 12:30:05.123815	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":18,"itemsCount":1}}
75546	2025-07-04 12:30:05.198578	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":18}}
75557	2025-07-04 12:30:05.45465	INFO	Performance: getShipments	database	{"duration":76}
75562	2025-07-04 12:30:05.531392	INFO	Performance: DELETE /shipments/19	api	{"meta":{"statusCode":200,"responseSize":53},"duration":157}
75568	2025-07-04 12:30:05.781715	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":22,"itemsCount":1}}
75586	2025-07-04 12:30:06.172127	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":23,"itemsCount":1}}
75589	2025-07-04 12:30:06.257719	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":23}}
75595	2025-07-04 12:30:06.469717	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75600	2025-07-04 12:30:06.54698	INFO	Retrieved all shipments	app	{"meta":{"count":13,"entity":"Shipment"}}
75604	2025-07-04 12:30:06.621276	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":26}}
75614	2025-07-04 12:30:06.872195	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":27,"itemsCount":0}}
75617	2025-07-04 12:30:06.953251	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":27}}
75623	2025-07-04 12:30:07.138426	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75631	2025-07-04 12:30:07.290682	INFO	Shipment deleted	database	{"meta":{"shipmentId":31}}
75634	2025-07-04 12:30:07.46666	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75642	2025-07-04 12:30:07.553115	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2085},"duration":89}
75644	2025-07-04 12:30:07.616819	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":32}}
75650	2025-07-04 12:30:07.790582	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75665	2025-07-04 12:30:08.187968	INFO	DELETE /shipments/37	api	{"meta":{"method":"DELETE","url":"/shipments/37","bodySize":2}}
75667	2025-07-04 12:30:08.27602	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":8}}
75676	2025-07-04 12:30:08.548431	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75687	2025-07-04 12:30:08.708401	INFO	Shipment deleted	database	{"meta":{"shipmentId":41}}
75698	2025-07-04 12:30:08.965871	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":42,"itemsCount":0}}
75702	2025-07-04 12:30:09.037538	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":42}}
75708	2025-07-04 12:30:09.321539	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":43,"itemsCount":0}}
75734	2025-07-04 12:30:11.650977	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75742	2025-07-04 12:30:11.800829	INFO	Shipment deleted	database	{"meta":{"shipmentId":48}}
75748	2025-07-04 12:30:11.978791	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75754	2025-07-04 12:30:12.058701	INFO	Retrieved all shipments	app	{"meta":{"count":2,"entity":"Shipment"}}
75756	2025-07-04 12:30:12.142526	INFO	Shipment deleted	app	{"meta":{"shipmentId":49}}
75766	2025-07-04 12:30:12.461701	INFO	Performance: getShipments	database	{"duration":75}
72201	2025-07-04 11:51:34.892935	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72204	2025-07-04 11:51:35.364831	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
72212	2025-07-04 11:51:35.849759	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72218	2025-07-04 11:51:46.155118	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72317	2025-07-04 11:55:33.146162	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72319	2025-07-04 11:55:43.338437	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72322	2025-07-04 11:55:53.709172	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":118702},"duration":118}
72325	2025-07-04 11:56:03.82532	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72327	2025-07-04 11:56:14.08729	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72329	2025-07-04 11:56:19.143441	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72331	2025-07-04 11:56:19.187678	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":47}
72347	2025-07-04 11:56:20.540672	DEBUG	Starting: getDocuments	database	\N
72358	2025-07-04 11:56:21.942396	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72375	2025-07-04 11:56:23.70587	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72384	2025-07-04 11:56:24.235892	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72390	2025-07-04 11:56:24.279092	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72402	2025-07-04 11:56:49.382698	INFO	Performance: getDocuments	database	{"duration":42}
72412	2025-07-04 11:56:52.508554	INFO	Performance: getDocuments	database	{"duration":43}
72422	2025-07-04 11:56:59.820608	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72435	2025-07-04 11:57:04.362776	DEBUG	Starting: getDocuments	database	\N
72443	2025-07-04 11:57:09.706453	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72463	2025-07-04 11:57:19.960417	INFO	Performance: getDocuments	database	{"duration":38}
72470	2025-07-04 11:57:27.040316	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630247016,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73901	2025-07-04 12:11:54.775945	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
75563	2025-07-04 12:30:05.71004	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75579	2025-07-04 12:30:06.090742	INFO	DELETE /shipments/23	api	{"meta":{"method":"DELETE","url":"/shipments/23","bodySize":2}}
75584	2025-07-04 12:30:06.167677	INFO	Retrieved all shipments	app	{"meta":{"count":14,"entity":"Shipment"}}
75587	2025-07-04 12:30:06.256083	INFO	Performance: DELETE /shipments/23	api	{"meta":{"statusCode":200,"responseSize":53},"duration":163}
75591	2025-07-04 12:30:06.466696	DEBUG	Starting: getShipments	database	\N
75605	2025-07-04 12:30:06.795012	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75620	2025-07-04 12:30:07.137094	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75633	2025-07-04 12:30:07.466022	INFO	DELETE /shipments/32	api	{"meta":{"method":"DELETE","url":"/shipments/32","bodySize":2}}
75647	2025-07-04 12:30:07.789382	INFO	DELETE /shipments/36	api	{"meta":{"method":"DELETE","url":"/shipments/36","bodySize":2}}
75655	2025-07-04 12:30:07.869201	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1892},"duration":82}
75658	2025-07-04 12:30:07.946877	INFO	Shipment deleted	app	{"meta":{"shipmentId":36}}
75664	2025-07-04 12:30:08.187793	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75672	2025-07-04 12:30:08.333694	INFO	Shipment deleted	database	{"meta":{"shipmentId":37}}
75680	2025-07-04 12:30:08.621909	INFO	Performance: getShipments	database	{"duration":75}
75693	2025-07-04 12:30:08.889927	DEBUG	Starting: getShipments	database	\N
75694	2025-07-04 12:30:08.962526	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":6}}
75706	2025-07-04 12:30:09.247047	DEBUG	Starting: getShipments	database	\N
75711	2025-07-04 12:30:09.329638	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1069},"duration":82}
75713	2025-07-04 12:30:09.400101	INFO	Shipment deleted	app	{"meta":{"shipmentId":43}}
75718	2025-07-04 12:30:09.571417	DEBUG	Starting: getShipments	database	\N
75723	2025-07-04 12:30:09.64669	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":876},"duration":77}
75728	2025-07-04 12:30:11.472583	INFO	Shipment deleted	app	{"meta":{"shipmentId":47}}
75732	2025-07-04 12:30:11.65	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75735	2025-07-04 12:30:11.723278	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
75747	2025-07-04 12:30:11.978545	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75751	2025-07-04 12:30:12.057244	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":2}}
75759	2025-07-04 12:30:12.384315	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75769	2025-07-04 12:30:12.535401	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":50}}
75773	2025-07-04 12:30:12.711612	DEBUG	Starting: getShipments	database	\N
75778	2025-07-04 12:30:12.750728	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
75791	2025-07-04 12:30:13.264812	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":0}}
75793	2025-07-04 12:30:14.080427	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75808	2025-07-04 12:30:14.652501	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75837	2025-07-04 12:30:16.449439	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":0}}
75849	2025-07-04 12:30:30.06217	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":0}}
77330	2025-07-04 12:46:33.548022	INFO	Performance: getShipments	database	{"duration":76}
72202	2025-07-04 11:51:34.893387	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72203	2025-07-04 11:51:35.328307	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72213	2025-07-04 11:51:35.852365	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629895828,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72226	2025-07-04 11:51:46.160616	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72323	2025-07-04 11:55:53.763671	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72324	2025-07-04 11:56:03.824366	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72326	2025-07-04 11:56:14.08629	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72328	2025-07-04 11:56:19.142467	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72332	2025-07-04 11:56:19.188036	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630179167,"responseTime":49,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72346	2025-07-04 11:56:20.537933	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72361	2025-07-04 11:56:21.943052	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/shipments:{}","method":"GET","url":"/api/shipments"}}
72364	2025-07-04 11:56:22.016853	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":70}
72367	2025-07-04 11:56:23.240029	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72370	2025-07-04 11:56:23.704289	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72387	2025-07-04 11:56:24.244444	DEBUG	Starting: getDocuments	database	\N
72397	2025-07-04 11:56:49.341522	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72409	2025-07-04 11:56:52.467959	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72415	2025-07-04 11:56:52.509159	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":46}
72418	2025-07-04 11:56:59.819574	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72432	2025-07-04 11:57:04.361205	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72439	2025-07-04 11:57:04.401053	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72444	2025-07-04 11:57:09.706712	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72451	2025-07-04 11:57:09.754765	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":45}
72457	2025-07-04 11:57:19.918924	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72471	2025-07-04 11:57:27.042698	DEBUG	Starting: getDocuments	database	\N
72482	2025-07-04 11:57:30.356547	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
73924	2025-07-04 12:12:11.538478	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":404},"duration":0}
73926	2025-07-04 12:12:12.046923	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73939	2025-07-04 12:12:13.514276	INFO	Performance: getDocuments	database	{"duration":81}
73946	2025-07-04 12:12:14.290725	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631134266,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73964	2025-07-04 12:12:15.60807	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73966	2025-07-04 12:12:16.335432	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73968	2025-07-04 12:12:16.428456	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":92}
73969	2025-07-04 12:12:17.104897	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75666	2025-07-04 12:30:08.26117	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":37,"itemsCount":0}}
75675	2025-07-04 12:30:08.547368	DEBUG	Starting: getShipments	database	\N
75692	2025-07-04 12:30:08.886479	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75696	2025-07-04 12:30:08.963528	INFO	Retrieved all shipments	app	{"meta":{"count":6,"entity":"Shipment"}}
75701	2025-07-04 12:30:09.036468	INFO	Performance: DELETE /shipments/42	api	{"meta":{"statusCode":200,"responseSize":53},"duration":154}
75710	2025-07-04 12:30:09.328575	INFO	Performance: getShipments	database	{"duration":78}
75716	2025-07-04 12:30:09.400807	INFO	Performance: DELETE /shipments/43	api	{"meta":{"statusCode":200,"responseSize":53},"duration":155}
75720	2025-07-04 12:30:09.572824	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75722	2025-07-04 12:30:09.646239	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":4}}
75725	2025-07-04 12:30:11.32507	INFO	DELETE /shipments/47	api	{"meta":{"method":"DELETE","url":"/shipments/47","bodySize":2}}
75727	2025-07-04 12:30:11.471699	INFO	Shipment deleted	database	{"meta":{"shipmentId":47}}
75731	2025-07-04 12:30:11.649779	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75739	2025-07-04 12:30:11.725124	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":631},"duration":76}
75740	2025-07-04 12:30:11.799885	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":48}}
75749	2025-07-04 12:30:11.978976	DEBUG	Starting: getShipments	database	\N
75755	2025-07-04 12:30:12.137804	INFO	Shipment deleted	database	{"meta":{"shipmentId":49}}
75760	2025-07-04 12:30:12.38466	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75770	2025-07-04 12:30:12.535747	INFO	Shipment deleted	database	{"meta":{"shipmentId":50}}
75775	2025-07-04 12:30:12.712179	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75781	2025-07-04 12:30:13.226799	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75790	2025-07-04 12:30:13.265076	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
75794	2025-07-04 12:30:14.081038	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632214059,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75803	2025-07-04 12:30:14.120801	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
75806	2025-07-04 12:30:14.652205	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72200	2025-07-04 11:51:34.892569	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751629894739,"responseTime":0,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72205	2025-07-04 11:51:35.365166	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72209	2025-07-04 11:51:35.850656	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72224	2025-07-04 11:51:46.160274	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72333	2025-07-04 11:56:19.272877	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72348	2025-07-04 11:56:20.573904	INFO	Performance: getDocuments	database	{"duration":37}
72352	2025-07-04 11:56:21.939865	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72363	2025-07-04 11:56:22.013383	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72365	2025-07-04 11:56:23.195861	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72366	2025-07-04 11:56:23.239036	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":43}
72368	2025-07-04 11:56:23.703114	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73942	2025-07-04 12:12:13.565414	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73948	2025-07-04 12:12:14.291842	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73963	2025-07-04 12:12:15.534569	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
73965	2025-07-04 12:12:15.609401	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
73967	2025-07-04 12:12:16.428092	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73973	2025-07-04 12:12:17.109156	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73980	2025-07-04 12:12:17.149701	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":44}
75699	2025-07-04 12:30:09.03599	INFO	Shipment deleted	database	{"meta":{"shipmentId":42}}
75704	2025-07-04 12:30:09.24657	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
75736	2025-07-04 12:30:11.723593	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":48,"itemsCount":1}}
75741	2025-07-04 12:30:11.800361	INFO	Shipment deleted	app	{"meta":{"shipmentId":48}}
75745	2025-07-04 12:30:11.977524	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
75761	2025-07-04 12:30:12.387992	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
75764	2025-07-04 12:30:12.460336	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":1}}
75788	2025-07-04 12:30:13.228742	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75799	2025-07-04 12:30:14.082972	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75810	2025-07-04 12:30:14.653521	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75816	2025-07-04 12:30:14.692205	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632214673,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75817	2025-07-04 12:30:15.180611	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75818	2025-07-04 12:30:15.223046	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":43}
75820	2025-07-04 12:30:15.854453	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75827	2025-07-04 12:30:15.894611	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
75830	2025-07-04 12:30:16.411089	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75846	2025-07-04 12:30:30.029047	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632230006,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76794	2025-07-04 12:41:18.624589	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76797	2025-07-04 12:41:18.833	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"566ms","forced":false}}
76805	2025-07-04 12:41:18.871247	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
76815	2025-07-04 12:41:24.22264	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
76817	2025-07-04 12:41:34.2908	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76819	2025-07-04 12:41:35.516905	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76829	2025-07-04 12:41:37.145037	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76840	2025-07-04 12:41:38.992365	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76859	2025-07-04 12:41:41.653124	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
77333	2025-07-04 12:46:33.581621	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
77340	2025-07-04 12:46:34.883519	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
77343	2025-07-04 12:46:45.089022	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":604},"duration":0}
77345	2025-07-04 12:46:55.351875	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77346	2025-07-04 12:46:59.061667	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77357	2025-07-04 12:47:04.213597	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77364	2025-07-04 12:47:11.078188	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77377	2025-07-04 12:47:11.772064	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77673	2025-07-04 12:58:57.699816	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77681	2025-07-04 12:58:57.77873	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633937758,"responseTime":3188,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77699	2025-07-04 13:04:06.223749	INFO	Performance: getSuppliers	database	{"duration":12002}
72334	2025-07-04 11:56:19.273516	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72345	2025-07-04 11:56:20.537697	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72359	2025-07-04 11:56:21.943067	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630181920,"responseTime":0,"endpoint":"/api/shipments","cacheHit":true,"dbQueries":0}}
72374	2025-07-04 11:56:23.705681	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72385	2025-07-04 11:56:24.238752	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72396	2025-07-04 11:56:49.341259	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630209320,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72408	2025-07-04 11:56:52.467774	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72421	2025-07-04 11:56:59.820399	DEBUG	Starting: getDocuments	database	\N
72438	2025-07-04 11:57:04.400145	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72442	2025-07-04 11:57:09.70493	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72458	2025-07-04 11:57:19.91922	DEBUG	Starting: getDocuments	database	\N
72469	2025-07-04 11:57:27.039184	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72474	2025-07-04 11:57:27.079355	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72483	2025-07-04 11:57:30.467291	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":150724},"duration":146}
73954	2025-07-04 12:12:14.406741	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73957	2025-07-04 12:12:15.154767	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73959	2025-07-04 12:12:15.53048	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73970	2025-07-04 12:12:17.10854	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75765	2025-07-04 12:30:12.461522	INFO	Retrieved all shipments	app	{"meta":{"count":1,"entity":"Shipment"}}
75787	2025-07-04 12:30:13.228601	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75796	2025-07-04 12:30:14.081822	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75809	2025-07-04 12:30:14.653316	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632214633,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75821	2025-07-04 12:30:15.855309	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75835	2025-07-04 12:30:16.412731	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75847	2025-07-04 12:30:30.029178	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
76798	2025-07-04 12:41:18.83324	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76808	2025-07-04 12:41:18.871839	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"776ms","forced":false}}
76814	2025-07-04 12:41:24.113039	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":48}
76825	2025-07-04 12:41:35.55414	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":43}
76830	2025-07-04 12:41:37.145714	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76843	2025-07-04 12:41:38.992935	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632898970,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76857	2025-07-04 12:41:41.651726	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77336	2025-07-04 12:46:34.850342	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":604},"duration":1}
77349	2025-07-04 12:46:59.071802	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77358	2025-07-04 12:47:04.214026	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77368	2025-07-04 12:47:11.079477	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77370	2025-07-04 12:47:11.151753	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77376	2025-07-04 12:47:11.769619	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77674	2025-07-04 12:58:57.704533	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77680	2025-07-04 12:58:57.777087	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":3188}
77685	2025-07-04 13:01:01.32479	INFO	Performance: getContractors	database	{"duration":4922}
77691	2025-07-04 13:01:12.228289	INFO	Performance: getSuppliers	database	{"duration":8422}
77700	2025-07-04 13:04:09.424935	INFO	Performance: getInventory	database	{"meta":{},"duration":12901}
77711	2025-07-04 13:04:10.626442	INFO	Performance: getProducts	database	{"duration":15396}
77725	2025-07-04 13:20:53.197916	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77729	2025-07-04 13:20:53.615572	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"1124ms","forced":false}}
77739	2025-07-04 13:20:53.683809	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77742	2025-07-04 13:41:55.698076	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
77752	2025-07-04 13:41:55.739034	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77762	2025-07-04 13:41:55.775395	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"236ms","forced":false}}
77770	2025-07-04 13:41:55.810923	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"248ms","forced":false}}
77779	2025-07-04 13:41:55.846726	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":868,"duration":"352ms","forced":false}}
77787	2025-07-04 13:42:00.887983	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72335	2025-07-04 11:56:19.280122	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72344	2025-07-04 11:56:20.535492	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72354	2025-07-04 11:56:21.941563	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
72371	2025-07-04 11:56:23.705071	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72388	2025-07-04 11:56:24.276828	INFO	Performance: getDocuments	database	{"duration":40}
72393	2025-07-04 11:56:49.340449	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72407	2025-07-04 11:56:52.467612	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630212445,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72416	2025-07-04 11:56:59.81845	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72431	2025-07-04 11:57:04.360999	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72445	2025-07-04 11:57:09.710887	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72449	2025-07-04 11:57:09.753742	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72454	2025-07-04 11:57:19.918332	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630239895,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72460	2025-07-04 11:57:19.958333	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72465	2025-07-04 11:57:27.03836	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72473	2025-07-04 11:57:27.078416	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72476	2025-07-04 11:57:30.311223	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
73981	2025-07-04 12:13:14.994366	DEBUG	Starting: getSuppliers	database	\N
73985	2025-07-04 12:13:15.133783	DEBUG	Starting: getWarehouses	database	\N
73996	2025-07-04 12:13:15.188537	DEBUG	Starting: getProducts	database	\N
74004	2025-07-04 12:13:15.327654	INFO	Performance: getInventory	database	{"meta":{},"duration":1299}
74022	2025-07-04 12:13:15.891365	INFO	Performance: getDocuments	database	{"duration":2062}
74032	2025-07-04 12:13:18.334434	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":469443},"duration":200}
74033	2025-07-04 12:13:28.413082	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74035	2025-07-04 12:13:35.464696	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74048	2025-07-04 12:13:49.395718	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74060	2025-07-04 12:13:50.233672	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74067	2025-07-04 12:13:50.275477	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631230256,"responseTime":46,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74069	2025-07-04 12:13:51.178362	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74071	2025-07-04 12:13:51.321944	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":143}
74074	2025-07-04 12:13:54.242259	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74090	2025-07-04 12:13:56.320938	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74093	2025-07-04 12:13:56.98825	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74101	2025-07-04 12:13:57.773665	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75772	2025-07-04 12:30:12.538062	INFO	Performance: DELETE /shipments/50	api	{"meta":{"statusCode":200,"responseSize":53},"duration":154}
75779	2025-07-04 12:30:12.750928	INFO	Performance: getShipments	database	{"duration":38}
75785	2025-07-04 12:30:13.228165	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75800	2025-07-04 12:30:14.083696	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75811	2025-07-04 12:30:14.654517	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75825	2025-07-04 12:30:15.856264	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632215834,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75829	2025-07-04 12:30:16.409732	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632216388,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75839	2025-07-04 12:30:16.452278	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632216431,"responseTime":39,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75844	2025-07-04 12:30:30.028386	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76799	2025-07-04 12:41:18.833394	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"475ms","forced":false}}
76845	2025-07-04 12:41:38.993185	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76856	2025-07-04 12:41:41.651773	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76864	2025-07-04 12:41:41.688027	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76868	2025-07-04 12:41:41.737004	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
76870	2025-07-04 12:41:42.308099	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76874	2025-07-04 12:42:00.392133	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76876	2025-07-04 12:42:18.248803	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76880	2025-07-04 12:42:21.942767	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
76882	2025-07-04 12:42:35.263141	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
77344	2025-07-04 12:46:55.351513	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":604},"duration":0}
77352	2025-07-04 12:46:59.104766	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":42}
77354	2025-07-04 12:47:04.205518	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77365	2025-07-04 12:47:11.078789	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77372	2025-07-04 12:47:11.152169	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72336	2025-07-04 11:56:19.281732	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630179125,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72341	2025-07-04 11:56:20.533493	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72350	2025-07-04 11:56:20.575892	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72355	2025-07-04 11:56:21.941735	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72373	2025-07-04 11:56:23.705478	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72379	2025-07-04 11:56:23.748805	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630183727,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72381	2025-07-04 11:56:24.234287	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72389	2025-07-04 11:56:24.277511	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":43}
72395	2025-07-04 11:56:49.340916	DEBUG	Starting: getDocuments	database	\N
72400	2025-07-04 11:56:49.381838	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72406	2025-07-04 11:56:52.467418	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72413	2025-07-04 11:56:52.50883	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72417	2025-07-04 11:56:59.819315	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72425	2025-07-04 11:56:59.859964	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
72430	2025-07-04 11:57:04.360603	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72447	2025-07-04 11:57:09.713093	DEBUG	Starting: getDocuments	database	\N
72456	2025-07-04 11:57:19.918664	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72462	2025-07-04 11:57:19.96021	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72468	2025-07-04 11:57:27.038987	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72479	2025-07-04 11:57:30.316817	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73982	2025-07-04 12:13:15.131319	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
73992	2025-07-04 12:13:15.186797	DEBUG	Starting: getInventory	database	{"meta":{}}
74001	2025-07-04 12:13:15.325901	INFO	Performance: getContractors	database	{"duration":1302}
74011	2025-07-04 12:13:15.400238	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"1314ms","forced":false}}
74020	2025-07-04 12:13:15.889574	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"1511ms","forced":false}}
74028	2025-07-04 12:13:18.134741	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74038	2025-07-04 12:13:35.468273	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74046	2025-07-04 12:13:49.393839	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74065	2025-07-04 12:13:50.273571	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
74076	2025-07-04 12:13:56.244216	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74083	2025-07-04 12:13:56.278888	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74094	2025-07-04 12:13:57.771726	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75797	2025-07-04 12:30:14.082188	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75812	2025-07-04 12:30:14.654734	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75815	2025-07-04 12:30:14.692007	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
75819	2025-07-04 12:30:15.223313	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
75826	2025-07-04 12:30:15.894281	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
75831	2025-07-04 12:30:16.411391	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75842	2025-07-04 12:30:30.026177	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75851	2025-07-04 12:30:30.064483	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
76828	2025-07-04 12:41:37.145321	DEBUG	Starting: getDocuments	database	\N
76841	2025-07-04 12:41:38.992542	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76858	2025-07-04 12:41:41.652072	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632901630,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77371	2025-07-04 12:47:11.151958	INFO	Performance: getDocuments	database	{"duration":78}
77375	2025-07-04 12:47:11.768592	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77675	2025-07-04 12:58:57.705811	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633934545,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77687	2025-07-04 13:01:01.325287	INFO	Performance: getInventory	database	{"meta":{},"duration":7322}
77695	2025-07-04 13:01:12.234042	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"8424ms","forced":false}}
77701	2025-07-04 13:04:09.42548	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77712	2025-07-04 13:04:10.626816	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"15398ms","forced":false}}
77724	2025-07-04 13:20:53.193724	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"623ms","forced":false}}
77728	2025-07-04 13:20:53.615163	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
77743	2025-07-04 13:41:55.700827	DEBUG	Starting: getWarehouses	database	\N
72337	2025-07-04 11:56:19.282478	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72340	2025-07-04 11:56:20.532748	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630180512,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72349	2025-07-04 11:56:20.575677	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72353	2025-07-04 11:56:21.941438	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630181917,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72372	2025-07-04 11:56:23.705278	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72380	2025-07-04 11:56:24.233984	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72394	2025-07-04 11:56:49.340744	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72401	2025-07-04 11:56:49.381696	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":45}
72405	2025-07-04 11:56:52.46721	DEBUG	Starting: getDocuments	database	\N
72424	2025-07-04 11:56:59.85891	INFO	Performance: getDocuments	database	{"duration":36}
72429	2025-07-04 11:57:04.36029	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72448	2025-07-04 11:57:09.752726	INFO	Performance: getDocuments	database	{"duration":42}
72455	2025-07-04 11:57:19.918508	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72461	2025-07-04 11:57:19.960061	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
72466	2025-07-04 11:57:27.038647	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72481	2025-07-04 11:57:30.317927	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73983	2025-07-04 12:13:15.13247	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
73994	2025-07-04 12:13:15.187329	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
74003	2025-07-04 12:13:15.326549	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"1304ms","forced":false}}
74013	2025-07-04 12:13:15.40079	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"1311ms","forced":false}}
74024	2025-07-04 12:13:15.892388	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"2071ms","forced":false}}
74025	2025-07-04 12:13:18.13123	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74042	2025-07-04 12:13:35.669553	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":472004},"duration":192}
74043	2025-07-04 12:13:45.715959	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74052	2025-07-04 12:13:49.461607	INFO	Performance: getDocuments	database	{"duration":74}
74064	2025-07-04 12:13:50.235614	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74066	2025-07-04 12:13:50.274221	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":44}
74077	2025-07-04 12:13:56.24492	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74100	2025-07-04 12:13:57.77296	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74105	2025-07-04 12:13:57.814315	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631237794,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74107	2025-07-04 12:13:58.494861	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74109	2025-07-04 12:14:12.762971	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74110	2025-07-04 12:14:12.838148	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
74112	2025-07-04 12:14:24.910361	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74114	2025-07-04 12:14:24.989117	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
74115	2025-07-04 12:14:46.952353	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74116	2025-07-04 12:14:47.044757	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":93}
74118	2025-07-04 12:14:57.94961	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74119	2025-07-04 12:14:58.027004	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":78}
74121	2025-07-04 12:15:15.62008	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74122	2025-07-04 12:15:15.703308	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":85}
75804	2025-07-04 12:30:14.121205	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
75813	2025-07-04 12:30:14.654912	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75824	2025-07-04 12:30:15.856074	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75832	2025-07-04 12:30:16.411609	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75848	2025-07-04 12:30:30.030193	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76852	2025-07-04 12:41:40.263966	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76862	2025-07-04 12:41:41.686029	DEBUG	Starting: getShipments	database	\N
77373	2025-07-04 12:47:11.192242	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77381	2025-07-04 12:47:12.028594	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1155059},"duration":245}
77382	2025-07-04 12:47:22.04473	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77384	2025-07-04 12:47:32.244243	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
77386	2025-07-04 12:47:42.487124	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
77389	2025-07-04 12:47:43.398826	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1157788},"duration":237}
77397	2025-07-04 12:47:47.560249	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1158172},"duration":245}
77398	2025-07-04 12:47:50.57231	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
77405	2025-07-04 12:47:51.595813	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72338	2025-07-04 11:56:19.284562	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72342	2025-07-04 11:56:20.533926	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72360	2025-07-04 11:56:21.943181	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/shipments:{}","dataSize":2}}
72376	2025-07-04 11:56:23.706018	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72378	2025-07-04 11:56:23.74744	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
72382	2025-07-04 11:56:24.235014	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72398	2025-07-04 11:56:49.342067	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72403	2025-07-04 11:56:49.38282	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72410	2025-07-04 11:56:52.468108	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72420	2025-07-04 11:56:59.820066	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72426	2025-07-04 11:56:59.860904	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72433	2025-07-04 11:57:04.361543	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630224336,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73984	2025-07-04 12:13:15.133162	DEBUG	Starting: getDocuments	database	\N
73993	2025-07-04 12:13:15.187419	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
74002	2025-07-04 12:13:15.326373	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
74012	2025-07-04 12:13:15.400673	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74021	2025-07-04 12:13:15.89046	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"2074ms","forced":false}}
74026	2025-07-04 12:13:18.131618	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74040	2025-07-04 12:13:35.470335	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74047	2025-07-04 12:13:49.39431	DEBUG	Starting: getDocuments	database	\N
74058	2025-07-04 12:13:50.232264	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74081	2025-07-04 12:13:56.247746	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
74103	2025-07-04 12:13:57.812065	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
75836	2025-07-04 12:30:16.413094	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75841	2025-07-04 12:30:30.025974	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76885	2025-07-04 12:42:35.395766	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77374	2025-07-04 12:47:11.768306	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77676	2025-07-04 12:58:57.768055	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77688	2025-07-04 13:01:01.325585	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"7324ms","forced":false}}
77690	2025-07-04 13:01:12.22814	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77702	2025-07-04 13:04:09.426413	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"14298ms","forced":false}}
77713	2025-07-04 13:04:10.62772	INFO	Performance: getWarehouses	database	{"duration":14702}
77726	2025-07-04 13:20:53.609325	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":43}}
77736	2025-07-04 13:20:53.683191	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"1188ms","forced":false}}
77744	2025-07-04 13:41:55.703085	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
77754	2025-07-04 13:41:55.74078	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":126}}
77773	2025-07-04 13:41:55.818318	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"250ms","forced":false}}
77782	2025-07-04 13:41:55.854893	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"354ms","forced":false}}
77790	2025-07-04 13:42:00.892554	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77793	2025-07-04 13:49:56.046161	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77887	2025-07-04 13:55:00.253595	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77895	2025-07-04 13:55:10.583569	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
77916	2025-07-04 13:55:14.379371	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77918	2025-07-04 13:55:14.425843	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77922	2025-07-04 13:55:16.109146	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77932	2025-07-04 13:55:16.153549	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637316133,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77941	2025-07-04 13:55:18.570048	DEBUG	Starting: getShipments	database	\N
77963	2025-07-04 13:55:20.866468	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77967	2025-07-04 13:55:22.202088	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77978	2025-07-04 13:55:22.243259	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77986	2025-07-04 13:55:23.583303	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1281345},"duration":284}
77988	2025-07-04 14:00:36.006994	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
72339	2025-07-04 11:56:19.286427	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72343	2025-07-04 11:56:20.534568	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72351	2025-07-04 11:56:20.576721	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72357	2025-07-04 11:56:21.942141	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72377	2025-07-04 11:56:23.746902	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":0}}
72383	2025-07-04 11:56:24.235693	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630184212,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72391	2025-07-04 11:56:24.279289	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72399	2025-07-04 11:56:49.34276	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72411	2025-07-04 11:56:52.468612	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72414	2025-07-04 11:56:52.508995	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72423	2025-07-04 11:56:59.82077	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630219797,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72434	2025-07-04 11:57:04.362531	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72446	2025-07-04 11:57:09.712924	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72450	2025-07-04 11:57:09.754569	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72459	2025-07-04 11:57:19.921174	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72475	2025-07-04 11:57:27.079959	INFO	Performance: getDocuments	database	{"duration":38}
72477	2025-07-04 11:57:30.313462	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73986	2025-07-04 12:13:15.132311	DEBUG	Starting: getInventory	database	{"meta":{}}
73998	2025-07-04 12:13:15.195827	INFO	Performance: getSuppliers	database	{"duration":1296}
74008	2025-07-04 12:13:15.329803	INFO	Performance: getProducts	database	{"duration":1308}
74017	2025-07-04 12:13:15.40536	INFO	Performance: getInventory	database	{"meta":{},"duration":1311}
74029	2025-07-04 12:13:18.138776	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74037	2025-07-04 12:13:35.468023	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74049	2025-07-04 12:13:49.396989	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74054	2025-07-04 12:13:49.46246	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":76}
74061	2025-07-04 12:13:50.234367	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74078	2025-07-04 12:13:56.246051	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74095	2025-07-04 12:13:57.772112	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75852	2025-07-04 12:30:40.055656	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75862	2025-07-04 12:30:40.098626	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632240079,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75871	2025-07-04 12:30:42.528037	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":842743},"duration":255}
75874	2025-07-04 12:30:42.783828	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
75884	2025-07-04 12:30:43.871736	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":844995},"duration":203}
75888	2025-07-04 12:30:44.559338	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
75896	2025-07-04 12:30:45.091076	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75903	2025-07-04 12:30:45.69584	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75920	2025-07-04 12:30:46.470283	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75929	2025-07-04 12:30:47.813014	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":1306},"duration":2}
75936	2025-07-04 12:30:53.962936	INFO	POST /documents/create	api	{"meta":{"method":"POST","url":"/documents/create","bodySize":137}}
75937	2025-07-04 12:30:54.248453	INFO	Inventory cache invalidated after receipt document creation	api	{"meta":{"documentId":305}}
75948	2025-07-04 12:30:54.502562	INFO	Performance: getDocuments	database	{"duration":74}
75956	2025-07-04 12:30:55.375648	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75962	2025-07-04 12:30:55.417637	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632255396,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75966	2025-07-04 12:30:57.816919	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
75971	2025-07-04 12:30:59.855527	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75998	2025-07-04 12:31:07.763091	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76001	2025-07-04 12:31:07.803941	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
76003	2025-07-04 12:31:08.869808	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76005	2025-07-04 12:31:08.949018	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":75}
76886	2025-07-04 12:42:35.403398	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77385	2025-07-04 12:47:32.244566	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77387	2025-07-04 12:47:42.487478	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77388	2025-07-04 12:47:43.145944	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77390	2025-07-04 12:47:47.294528	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77407	2025-07-04 12:47:51.596084	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77410	2025-07-04 12:47:51.66847	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77677	2025-07-04 12:58:57.772057	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77727	2025-07-04 13:20:53.614587	INFO	Performance: getContractors	database	{"duration":1121}
72427	2025-07-04 11:56:59.968371	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72428	2025-07-04 11:57:04.358896	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72436	2025-07-04 11:57:04.397926	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72440	2025-07-04 11:57:09.703772	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72452	2025-07-04 11:57:19.917849	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72464	2025-07-04 11:57:27.038038	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72472	2025-07-04 11:57:27.078	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72478	2025-07-04 11:57:30.313679	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
73987	2025-07-04 12:13:15.134108	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":28292}}
73995	2025-07-04 12:13:15.188619	DEBUG	Starting: getShipments	database	\N
74005	2025-07-04 12:13:15.327557	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
74014	2025-07-04 12:13:15.402094	INFO	Performance: getWarehouses	database	{"duration":1313}
74023	2025-07-04 12:13:15.891553	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74027	2025-07-04 12:13:18.132351	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":6}
74041	2025-07-04 12:13:35.515495	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":44}
74044	2025-07-04 12:13:45.716966	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
74045	2025-07-04 12:13:49.388599	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74059	2025-07-04 12:13:50.233392	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74086	2025-07-04 12:13:56.28817	INFO	Performance: getShipments	database	{"duration":37}
74102	2025-07-04 12:13:57.773853	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
75853	2025-07-04 12:30:40.058041	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75863	2025-07-04 12:30:40.098812	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
75864	2025-07-04 12:30:42.250253	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
75880	2025-07-04 12:30:43.638827	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
75885	2025-07-04 12:30:44.558348	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":1306}}
75890	2025-07-04 12:30:45.086582	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632245066,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75898	2025-07-04 12:30:45.12647	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
75902	2025-07-04 12:30:45.694414	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75914	2025-07-04 12:30:46.45604	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75922	2025-07-04 12:30:46.495783	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
75926	2025-07-04 12:30:47.811497	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":1306}}
75954	2025-07-04 12:30:55.375266	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75970	2025-07-04 12:30:59.855311	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75977	2025-07-04 12:30:59.890052	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632259839,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
75991	2025-07-04 12:31:07.760269	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
76887	2025-07-04 12:42:35.411519	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77391	2025-07-04 12:47:47.420302	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77409	2025-07-04 12:47:51.596221	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633271572,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77678	2025-07-04 12:58:57.773579	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77684	2025-07-04 13:01:01.324289	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77694	2025-07-04 13:01:12.232666	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
77704	2025-07-04 13:04:09.42706	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77709	2025-07-04 13:04:10.625644	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77716	2025-07-04 13:04:11.326896	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"16000ms","forced":false}}
77730	2025-07-04 13:20:53.624531	INFO	Performance: getProducts	database	{"duration":1131}
77740	2025-07-04 13:20:53.684035	INFO	Performance: getInventory	database	{"meta":{},"duration":1185}
77745	2025-07-04 13:41:55.706653	DEBUG	Starting: getContractors	database	\N
77755	2025-07-04 13:41:55.744269	DEBUG	Starting: getProducts	database	\N
77763	2025-07-04 13:41:55.779118	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77772	2025-07-04 13:41:55.818014	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77781	2025-07-04 13:41:55.854541	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77785	2025-07-04 13:42:00.886802	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77794	2025-07-04 13:49:56.262865	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77885	2025-07-04 13:55:00.245495	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77899	2025-07-04 13:55:10.628491	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
72484	2025-07-04 11:57:33.19408	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72492	2025-07-04 11:57:33.913519	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
73988	2025-07-04 12:13:15.13551	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
73997	2025-07-04 12:13:15.188961	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74006	2025-07-04 12:13:15.327904	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74015	2025-07-04 12:13:15.402695	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
75854	2025-07-04 12:30:40.059509	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
75882	2025-07-04 12:30:43.641502	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":603},"duration":1}
75887	2025-07-04 12:30:44.559102	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632244538,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
75894	2025-07-04 12:30:45.090614	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75907	2025-07-04 12:30:45.696513	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75918	2025-07-04 12:30:46.464688	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75932	2025-07-04 12:30:47.813594	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75942	2025-07-04 12:30:54.431345	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75953	2025-07-04 12:30:55.375129	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75963	2025-07-04 12:30:55.417572	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
75964	2025-07-04 12:30:57.778736	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75965	2025-07-04 12:30:57.816207	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
75967	2025-07-04 12:30:59.854657	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75978	2025-07-04 12:30:59.890402	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
75985	2025-07-04 12:31:06.983248	INFO	Inventory cache invalidated after order creation with reserves	api	{"meta":{"orderId":92}}
75994	2025-07-04 12:31:07.761019	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632267739,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76888	2025-07-04 12:42:35.416711	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":507},"duration":0}
77392	2025-07-04 12:47:47.425775	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77406	2025-07-04 12:47:51.59599	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77412	2025-07-04 12:47:51.669038	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":81}
77679	2025-07-04 12:58:57.776653	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"3185ms","rowCount":1}}
77692	2025-07-04 13:01:12.228414	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"9924ms","forced":false}}
77703	2025-07-04 13:04:09.426788	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77710	2025-07-04 13:04:10.626086	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"14698ms","forced":false}}
77732	2025-07-04 13:20:53.682245	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77746	2025-07-04 13:41:55.712535	DEBUG	Starting: getSuppliers	database	\N
77757	2025-07-04 13:41:55.756076	INFO	Performance: getProducts	database	{"duration":234}
77765	2025-07-04 13:41:55.792486	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"246ms","forced":false}}
77775	2025-07-04 13:41:55.83187	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"252ms","forced":false}}
77788	2025-07-04 13:42:00.891818	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77795	2025-07-04 13:49:56.265388	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77886	2025-07-04 13:55:00.230856	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77898	2025-07-04 13:55:10.591129	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77905	2025-07-04 13:55:13.299575	INFO	Performance: getProducts	database	{"duration":42}
77912	2025-07-04 13:55:14.374429	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77930	2025-07-04 13:55:16.147725	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
77939	2025-07-04 13:55:18.56974	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
77946	2025-07-04 13:55:18.604781	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77950	2025-07-04 13:55:18.671674	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":4}}
77958	2025-07-04 13:55:20.865227	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77987	2025-07-04 14:00:36.006913	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":596},"duration":1}
78004	2025-07-04 14:20:23.452485	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
78014	2025-07-04 14:20:23.494099	DEBUG	Starting: getInventory	database	{"meta":{}}
78024	2025-07-04 14:20:23.529365	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"231ms","forced":false}}
78047	2025-07-04 14:34:36.246181	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"production","pid":43}}
72485	2025-07-04 11:57:33.194887	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630253171,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72491	2025-07-04 11:57:33.912056	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
73989	2025-07-04 12:13:15.13442	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
74010	2025-07-04 12:13:15.330059	INFO	Performance: getShipments	database	{"duration":1261}
74019	2025-07-04 12:13:15.407264	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"1317ms","forced":false}}
74030	2025-07-04 12:13:18.139067	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74039	2025-07-04 12:13:35.469199	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74050	2025-07-04 12:13:49.397152	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74055	2025-07-04 12:13:49.463053	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74062	2025-07-04 12:13:50.234336	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631230207,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74080	2025-07-04 12:13:56.247035	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631236224,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74087	2025-07-04 12:13:56.288992	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
74097	2025-07-04 12:13:57.772457	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74104	2025-07-04 12:13:57.813329	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
74106	2025-07-04 12:13:58.419727	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74108	2025-07-04 12:13:58.501094	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
74111	2025-07-04 12:14:12.839237	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74113	2025-07-04 12:14:24.988757	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74117	2025-07-04 12:14:47.046003	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74120	2025-07-04 12:14:58.027342	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74123	2025-07-04 12:15:15.703996	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75855	2025-07-04 12:30:40.059872	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632240039,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75891	2025-07-04 12:30:45.087062	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75899	2025-07-04 12:30:45.126759	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
75911	2025-07-04 12:30:45.731928	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":0}}
75915	2025-07-04 12:30:46.456446	DEBUG	Starting: getDocuments	database	\N
75931	2025-07-04 12:30:47.813302	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75939	2025-07-04 12:30:54.426253	DEBUG	Starting: getDocuments	database	\N
75955	2025-07-04 12:30:55.375498	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75969	2025-07-04 12:30:59.855173	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
75980	2025-07-04 12:30:59.891732	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":1306}}
75993	2025-07-04 12:31:07.760801	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
76889	2025-07-04 12:42:35.654157	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1054957},"duration":363}
77394	2025-07-04 12:47:47.430153	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
77399	2025-07-04 12:47:50.57265	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":1}
77408	2025-07-04 12:47:51.596157	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77693	2025-07-04 13:01:12.229304	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"21422ms","forced":false}}
77708	2025-07-04 13:04:10.62524	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
77733	2025-07-04 13:20:53.682788	INFO	Performance: getInventory	database	{"meta":{},"duration":1189}
77747	2025-07-04 13:41:55.713465	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
77758	2025-07-04 13:41:55.756459	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
77768	2025-07-04 13:41:55.79399	INFO	Performance: getInventory	database	{"meta":{},"duration":242}
77784	2025-07-04 13:41:55.872598	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":328,"duration":"407ms","forced":false}}
77786	2025-07-04 13:42:00.887623	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77796	2025-07-04 13:49:56.330645	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":669}
77890	2025-07-04 13:55:00.249987	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
77896	2025-07-04 13:55:10.588623	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
77904	2025-07-04 13:55:13.257734	DEBUG	Starting: getProducts	database	\N
77917	2025-07-04 13:55:14.425618	INFO	Performance: getDocuments	database	{"duration":46}
77925	2025-07-04 13:55:16.110299	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":3}
77942	2025-07-04 13:55:18.57544	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637318554,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77960	2025-07-04 13:55:20.86585	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637320845,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77969	2025-07-04 13:55:22.202797	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77975	2025-07-04 13:55:22.241588	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72486	2025-07-04 11:57:33.19527	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72489	2025-07-04 11:57:33.909132	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
73990	2025-07-04 12:13:15.134865	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73999	2025-07-04 12:13:15.196033	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"1300ms","forced":false}}
74009	2025-07-04 12:13:15.330117	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"1309ms","forced":false}}
74018	2025-07-04 12:13:15.406903	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74031	2025-07-04 12:13:18.176457	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
74034	2025-07-04 12:13:28.413426	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74036	2025-07-04 12:13:35.466535	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
74051	2025-07-04 12:13:49.39882	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631229371,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74053	2025-07-04 12:13:49.461956	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74063	2025-07-04 12:13:50.234652	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74079	2025-07-04 12:13:56.247056	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74088	2025-07-04 12:13:56.289099	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
74096	2025-07-04 12:13:57.772271	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631237750,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75856	2025-07-04 12:30:40.060194	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75909	2025-07-04 12:30:45.696762	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75912	2025-07-04 12:30:45.734259	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632245714,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
75916	2025-07-04 12:30:46.456591	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75924	2025-07-04 12:30:46.497474	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":43}
75927	2025-07-04 12:30:47.812019	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
75940	2025-07-04 12:30:54.427042	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75960	2025-07-04 12:30:55.414584	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
75972	2025-07-04 12:30:59.855734	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75997	2025-07-04 12:31:07.762138	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76004	2025-07-04 12:31:08.944732	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76890	2025-07-04 12:42:42.802697	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76912	2025-07-04 12:42:43.802349	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76914	2025-07-04 12:42:44.530645	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76915	2025-07-04 12:42:44.569749	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
76917	2025-07-04 12:42:45.590945	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
76933	2025-07-04 12:42:47.218596	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/suppliers:{}","method":"GET","url":"/api/suppliers"}}
76938	2025-07-04 12:42:48.396457	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":453},"duration":4}
76944	2025-07-04 12:42:48.890789	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632968870,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76955	2025-07-04 12:42:51.922564	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76965	2025-07-04 12:43:14.590802	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76982	2025-07-04 12:43:16.153141	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76996	2025-07-04 12:43:16.723212	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77001	2025-07-04 12:43:16.801487	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":83}
77005	2025-07-04 12:43:17.306283	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":44}
77007	2025-07-04 12:43:17.724449	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77031	2025-07-04 12:43:18.902061	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77393	2025-07-04 12:47:47.430286	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":2}
77400	2025-07-04 12:47:50.573059	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
77403	2025-07-04 12:47:51.58855	DEBUG	Starting: getDocuments	database	\N
77717	2025-07-04 13:04:11.340692	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"12700ms","forced":false}}
77734	2025-07-04 13:20:53.68296	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"1191ms","forced":false}}
77748	2025-07-04 13:41:55.714343	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
77756	2025-07-04 13:41:55.750892	DEBUG	Starting: getShipments	database	\N
77764	2025-07-04 13:41:55.786654	INFO	Performance: getInventory	database	{"meta":{},"duration":232}
77774	2025-07-04 13:41:55.831491	INFO	Performance: getSuppliers	database	{"duration":247}
77797	2025-07-04 13:49:56.472294	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1244266},"duration":952}
78069	2025-07-04 14:36:52.50866	DEBUG	Starting: getInventory	database	{"meta":{}}
72487	2025-07-04 11:57:33.194742	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72490	2025-07-04 11:57:33.911167	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":1}
73991	2025-07-04 12:13:15.135108	DEBUG	Starting: getContractors	database	\N
74000	2025-07-04 12:13:15.196531	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
74007	2025-07-04 12:13:15.328831	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"1307ms","forced":false}}
74016	2025-07-04 12:13:15.403167	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
75857	2025-07-04 12:30:40.061437	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75881	2025-07-04 12:30:43.639265	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
75889	2025-07-04 12:30:44.56202	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":1306},"duration":2}
75897	2025-07-04 12:30:45.091713	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75910	2025-07-04 12:30:45.698597	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632245675,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75921	2025-07-04 12:30:46.470476	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
75934	2025-07-04 12:30:47.813943	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75944	2025-07-04 12:30:54.431781	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75950	2025-07-04 12:30:54.503084	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":76}
75957	2025-07-04 12:30:55.376428	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75973	2025-07-04 12:30:59.856226	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632259834,"responseTime":0,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
75981	2025-07-04 12:30:59.893653	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":1306},"duration":2}
75987	2025-07-04 12:31:07.023742	INFO	Performance: POST /orders/create	api	{"meta":{"statusCode":201,"responseSize":236},"duration":295}
75990	2025-07-04 12:31:07.290132	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75995	2025-07-04 12:31:07.761328	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76891	2025-07-04 12:42:42.803275	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76899	2025-07-04 12:42:42.880899	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":78}
76904	2025-07-04 12:42:43.708805	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76921	2025-07-04 12:42:45.595335	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76929	2025-07-04 12:42:45.667694	INFO	Retrieved all shipments	app	{"meta":{"count":3,"entity":"Shipment"}}
76936	2025-07-04 12:42:47.21957	INFO	Performance: GET /suppliers	api	{"meta":{"statusCode":200,"responseSize":139},"duration":2}
76940	2025-07-04 12:42:48.397035	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
76946	2025-07-04 12:42:48.891922	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76949	2025-07-04 12:42:48.930266	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
76951	2025-07-04 12:42:50.676078	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76952	2025-07-04 12:42:50.715308	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76954	2025-07-04 12:42:51.92206	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76967	2025-07-04 12:43:14.591552	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76985	2025-07-04 12:43:16.154366	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76995	2025-07-04 12:43:16.722127	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632996701,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77012	2025-07-04 12:43:17.72633	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77016	2025-07-04 12:43:17.764719	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632997746,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77019	2025-07-04 12:43:18.247626	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632998227,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77033	2025-07-04 12:43:18.902643	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77395	2025-07-04 12:47:47.449964	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77402	2025-07-04 12:47:50.574664	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633270552,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
77413	2025-07-04 12:47:51.670328	INFO	Performance: getDocuments	database	{"duration":79}
77718	2025-07-04 13:04:11.732086	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
77735	2025-07-04 13:20:53.683085	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77749	2025-07-04 13:41:55.71843	DEBUG	Starting: getInventory	database	{"meta":{}}
77760	2025-07-04 13:41:55.756817	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"235ms","forced":false}}
77766	2025-07-04 13:41:55.792646	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77776	2025-07-04 13:41:55.83202	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
77798	2025-07-04 13:49:56.742015	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77888	2025-07-04 13:55:00.25696	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
77893	2025-07-04 13:55:10.582706	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77909	2025-07-04 13:55:13.302137	DEBUG	Response cached	app	{"meta":{"key":"http:/api/products:{}","size":2084}}
72488	2025-07-04 11:57:33.195201	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72495	2025-07-04 11:57:33.947006	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":40}
72498	2025-07-04 11:57:44.105169	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":1}
72500	2025-07-04 11:57:54.347867	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72502	2025-07-04 11:58:05.346163	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72504	2025-07-04 11:58:05.577748	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":155675},"duration":152}
72506	2025-07-04 11:58:15.553132	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72508	2025-07-04 11:58:18.675636	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72513	2025-07-04 11:58:18.928177	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
72515	2025-07-04 11:58:24.571572	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72523	2025-07-04 11:58:25.362565	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72538	2025-07-04 11:58:26.162344	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72567	2025-07-04 11:58:28.623761	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":0}}
72573	2025-07-04 11:58:29.13399	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74056	2025-07-04 12:13:49.512998	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74057	2025-07-04 12:13:50.23192	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74082	2025-07-04 12:13:56.248563	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
74085	2025-07-04 12:13:56.287729	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74099	2025-07-04 12:13:57.772794	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75858	2025-07-04 12:30:40.061258	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75866	2025-07-04 12:30:42.258816	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
75875	2025-07-04 12:30:42.784492	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":1306}}
75878	2025-07-04 12:30:43.634275	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
75900	2025-07-04 12:30:45.127605	INFO	Performance: getDocuments	database	{"duration":38}
75905	2025-07-04 12:30:45.696191	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
75913	2025-07-04 12:30:45.735792	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
75925	2025-07-04 12:30:46.497914	INFO	Performance: getDocuments	database	{"duration":41}
75930	2025-07-04 12:30:47.813181	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
75946	2025-07-04 12:30:54.432475	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75949	2025-07-04 12:30:54.502762	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
75958	2025-07-04 12:30:55.376605	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632255353,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75975	2025-07-04 12:30:59.856745	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
76000	2025-07-04 12:31:07.803569	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76892	2025-07-04 12:42:42.803588	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76902	2025-07-04 12:42:43.708349	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632963686,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76932	2025-07-04 12:42:45.676442	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632965575,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76935	2025-07-04 12:42:47.219424	INFO	GET /suppliers	api	{"meta":{"method":"GET","url":"/suppliers","bodySize":2}}
76941	2025-07-04 12:42:48.397218	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632968374,"responseTime":1,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
76943	2025-07-04 12:42:48.89012	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76957	2025-07-04 12:42:51.923364	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76968	2025-07-04 12:43:14.59146	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76986	2025-07-04 12:43:16.154512	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632996132,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76998	2025-07-04 12:43:16.723179	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77000	2025-07-04 12:43:16.800657	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77008	2025-07-04 12:43:17.724868	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77023	2025-07-04 12:43:18.251418	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77034	2025-07-04 12:43:18.902821	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77041	2025-07-04 12:43:18.940413	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632998922,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77396	2025-07-04 12:47:47.470423	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":171}
77401	2025-07-04 12:47:50.574053	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
77404	2025-07-04 12:47:51.589674	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77737	2025-07-04 13:20:53.683393	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77750	2025-07-04 13:41:55.719021	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77759	2025-07-04 13:41:55.756663	INFO	Performance: getContractors	database	{"duration":233}
77799	2025-07-04 13:49:56.7426	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72493	2025-07-04 11:57:33.91476	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74068	2025-07-04 12:13:50.349322	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74070	2025-07-04 12:13:51.319195	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74072	2025-07-04 12:13:54.164675	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74073	2025-07-04 12:13:54.241079	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
74075	2025-07-04 12:13:56.243542	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74084	2025-07-04 12:13:56.279271	DEBUG	Starting: getShipments	database	\N
74089	2025-07-04 12:13:56.319435	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
74091	2025-07-04 12:13:56.912772	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74092	2025-07-04 12:13:56.987567	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
74098	2025-07-04 12:13:57.772632	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75859	2025-07-04 12:30:40.061883	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75868	2025-07-04 12:30:42.265002	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
75870	2025-07-04 12:30:42.464556	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
75873	2025-07-04 12:30:42.783658	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
75879	2025-07-04 12:30:43.63443	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
75895	2025-07-04 12:30:45.090757	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75906	2025-07-04 12:30:45.696374	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75923	2025-07-04 12:30:46.496383	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
75928	2025-07-04 12:30:47.8127	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632247789,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
75943	2025-07-04 12:30:54.431569	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75951	2025-07-04 12:30:55.374629	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":2}
75968	2025-07-04 12:30:59.854924	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":301}}
75979	2025-07-04 12:30:59.890547	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
75982	2025-07-04 12:31:06.729127	INFO	POST /orders/create	api	{"meta":{"method":"POST","url":"/orders/create","bodySize":168}}
75983	2025-07-04 12:31:06.767525	INFO	Начинаем транзакцию создания заказа с резервами	app	{"meta":{"service":"transaction"}}
75984	2025-07-04 12:31:06.905717	DEBUG	Создан резерв для заказа	app	{"meta":{"orderId":92,"productId":444,"service":"transaction"}}
75986	2025-07-04 12:31:06.98515	INFO	Транзакция создания заказа завершена	app	{"meta":{"service":"transaction"}}
75988	2025-07-04 12:31:07.211995	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
75989	2025-07-04 12:31:07.289129	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
75992	2025-07-04 12:31:07.760642	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76893	2025-07-04 12:42:42.80388	DEBUG	Starting: getDocuments	database	\N
76898	2025-07-04 12:42:42.880629	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76909	2025-07-04 12:42:43.745173	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"43ms","rowCount":1}}
76919	2025-07-04 12:42:45.592909	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76928	2025-07-04 12:42:45.667349	INFO	Performance: getShipments	database	{"duration":76}
76934	2025-07-04 12:42:47.219213	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/suppliers:{}","dataSize":139}}
76939	2025-07-04 12:42:48.396827	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":453}}
76945	2025-07-04 12:42:48.890971	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76956	2025-07-04 12:42:51.923079	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632971902,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76966	2025-07-04 12:43:14.591205	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76983	2025-07-04 12:43:16.154023	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76989	2025-07-04 12:43:16.192242	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":44}
76992	2025-07-04 12:43:16.71729	DEBUG	Starting: getDocuments	database	\N
77011	2025-07-04 12:43:17.726128	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77027	2025-07-04 12:43:18.32513	INFO	Performance: getDocuments	database	{"duration":73}
77040	2025-07-04 12:43:18.937067	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
77411	2025-07-04 12:47:51.668871	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77738	2025-07-04 13:20:53.683689	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"1191ms","forced":false}}
77751	2025-07-04 13:41:55.728356	DEBUG	Starting: getInventory	database	{"meta":{}}
77761	2025-07-04 13:41:55.765939	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
77769	2025-07-04 13:41:55.803083	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77778	2025-07-04 13:41:55.838283	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":4}}
77791	2025-07-04 13:42:00.996896	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":109}
77800	2025-07-04 13:49:56.743638	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77889	2025-07-04 13:55:00.248667	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77897	2025-07-04 13:55:10.589141	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77903	2025-07-04 13:55:13.257414	DEBUG	Cache miss	app	{"meta":{"key":"http:/api/products:{}"}}
72494	2025-07-04 11:57:33.915131	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":2}
74124	2025-07-04 12:15:59.561678	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74126	2025-07-04 12:15:59.634068	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":215}
75860	2025-07-04 12:30:40.06217	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
75867	2025-07-04 12:30:42.264229	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":609},"duration":1}
75869	2025-07-04 12:30:42.426643	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
75872	2025-07-04 12:30:42.783335	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632242762,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
75883	2025-07-04 12:30:43.677902	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":43}
75886	2025-07-04 12:30:44.558875	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
75893	2025-07-04 12:30:45.09046	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":397},"duration":1}
75908	2025-07-04 12:30:45.696613	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75919	2025-07-04 12:30:46.464901	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
75933	2025-07-04 12:30:47.813746	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632247792,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75945	2025-07-04 12:30:54.43198	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632254410,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75947	2025-07-04 12:30:54.502118	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
75952	2025-07-04 12:30:55.374978	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75976	2025-07-04 12:30:59.858813	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":301},"duration":1}
75996	2025-07-04 12:31:07.761422	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76894	2025-07-04 12:42:42.804691	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76900	2025-07-04 12:42:42.881619	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76905	2025-07-04 12:42:43.709068	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76910	2025-07-04 12:42:43.749412	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632963729,"responseTime":46,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76918	2025-07-04 12:42:45.5925	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
76924	2025-07-04 12:42:45.629421	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76971	2025-07-04 12:43:14.592701	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76981	2025-07-04 12:43:16.152951	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76997	2025-07-04 12:43:16.723368	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77009	2025-07-04 12:43:17.725604	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77025	2025-07-04 12:43:18.25208	DEBUG	Starting: getDocuments	database	\N
77028	2025-07-04 12:43:18.331472	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77035	2025-07-04 12:43:18.903043	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77042	2025-07-04 12:43:18.94108	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":43}
77414	2025-07-04 12:47:51.71229	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77753	2025-07-04 13:41:55.739849	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77771	2025-07-04 13:41:55.816927	INFO	Performance: getWarehouses	database	{"duration":248}
77780	2025-07-04 13:41:55.85285	INFO	Performance: getDocuments	database	{"duration":340}
77792	2025-07-04 13:42:01.250103	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1242697},"duration":345}
77801	2025-07-04 13:50:26.923937	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":59986},"duration":25}
77891	2025-07-04 13:55:00.367584	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":247}
77894	2025-07-04 13:55:10.583277	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77915	2025-07-04 13:55:14.379017	DEBUG	Starting: getDocuments	database	\N
77924	2025-07-04 13:55:16.109961	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77949	2025-07-04 13:55:18.670066	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
77964	2025-07-04 13:55:20.866783	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77971	2025-07-04 13:55:22.203205	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637322180,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77983	2025-07-04 13:55:23.285605	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77989	2025-07-04 14:00:36.01472	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78006	2025-07-04 14:20:23.460333	DEBUG	Starting: getWarehouses	database	\N
78015	2025-07-04 14:20:23.499053	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
78025	2025-07-04 14:20:23.536198	INFO	Performance: getWarehouses	database	{"duration":232}
78036	2025-07-04 14:20:23.573346	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78048	2025-07-04 14:34:36.300312	INFO	Performance: getSuppliers	database	{"duration":606}
78051	2025-07-04 14:34:36.327433	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"614ms","forced":false}}
78055	2025-07-04 14:34:36.349136	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"659ms","forced":false}}
78067	2025-07-04 14:34:36.899873	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"1212ms","forced":false}}
78070	2025-07-04 14:36:52.549578	DEBUG	Starting: getDocuments	database	\N
72496	2025-07-04 11:57:34.059332	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":153541},"duration":141}
72497	2025-07-04 11:57:44.103152	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72499	2025-07-04 11:57:54.342661	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":1}
72501	2025-07-04 11:58:05.344984	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":1}
72503	2025-07-04 11:58:05.418234	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72505	2025-07-04 11:58:15.549382	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":1}
72507	2025-07-04 11:58:18.673194	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":692},"duration":0}
72512	2025-07-04 11:58:18.886873	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72518	2025-07-04 11:58:24.60705	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630304550,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72520	2025-07-04 11:58:25.346805	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72524	2025-07-04 11:58:25.39066	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72534	2025-07-04 11:58:26.161425	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630306139,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72558	2025-07-04 11:58:28.583208	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74125	2025-07-04 12:15:59.632336	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
75861	2025-07-04 12:30:40.097022	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":0}}
75865	2025-07-04 12:30:42.251763	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
75876	2025-07-04 12:30:42.786431	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":1306},"duration":1}
75877	2025-07-04 12:30:43.63391	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
75892	2025-07-04 12:30:45.088286	DEBUG	Starting: getDocuments	database	\N
75901	2025-07-04 12:30:45.127778	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
75904	2025-07-04 12:30:45.696061	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
75917	2025-07-04 12:30:46.458178	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632246436,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75935	2025-07-04 12:30:47.814907	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":397}}
75938	2025-07-04 12:30:54.248879	INFO	Performance: POST /documents/create	api	{"meta":{"statusCode":201,"responseSize":171},"duration":286}
75941	2025-07-04 12:30:54.427425	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
75959	2025-07-04 12:30:55.376934	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
75961	2025-07-04 12:30:55.415547	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":39}
75974	2025-07-04 12:30:59.856533	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632259827,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
75999	2025-07-04 12:31:07.763927	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76002	2025-07-04 12:31:07.80408	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632267783,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76895	2025-07-04 12:42:42.804954	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76907	2025-07-04 12:42:43.709455	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76911	2025-07-04 12:42:43.749761	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":45}
76920	2025-07-04 12:42:45.593466	DEBUG	Starting: getShipments	database	\N
76931	2025-07-04 12:42:45.674704	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":624},"duration":78}
76937	2025-07-04 12:42:47.220512	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632967199,"responseTime":0,"endpoint":"/api/suppliers","cacheHit":true,"dbQueries":0}}
76942	2025-07-04 12:42:48.397974	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
76950	2025-07-04 12:42:48.931125	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76953	2025-07-04 12:42:50.716638	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76960	2025-07-04 12:42:51.964208	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76963	2025-07-04 12:42:53.198019	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76970	2025-07-04 12:43:14.592297	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76988	2025-07-04 12:43:16.158483	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76994	2025-07-04 12:43:16.720273	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77014	2025-07-04 12:43:17.72673	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77018	2025-07-04 12:43:17.765553	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":40}
77020	2025-07-04 12:43:18.248558	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77037	2025-07-04 12:43:18.90369	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77415	2025-07-04 12:48:00.580367	DEBUG	Starting: getDocuments	database	\N
77421	2025-07-04 12:48:00.618313	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
77431	2025-07-04 12:48:00.655933	INFO	Performance: getInventory	database	{"meta":{},"duration":493}
77440	2025-07-04 12:48:00.690998	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
77455	2025-07-04 12:48:00.942369	INFO	Performance: getShipments	database	{"duration":793}
77461	2025-07-04 12:48:03.889693	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77474	2025-07-04 12:48:14.336038	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633294315,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77478	2025-07-04 12:48:14.45574	INFO	Performance: POST /shipments	api	{"meta":{"statusCode":201,"responseSize":179},"duration":89}
77498	2025-07-04 12:48:14.758174	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72509	2025-07-04 11:58:18.793524	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72511	2025-07-04 11:58:18.852452	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72516	2025-07-04 11:58:24.572001	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72521	2025-07-04 11:58:25.349539	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72526	2025-07-04 11:58:25.392397	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72539	2025-07-04 11:58:26.162773	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72551	2025-07-04 11:58:27.438897	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630307409,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72556	2025-07-04 11:58:28.139389	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
72565	2025-07-04 11:58:28.588157	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72576	2025-07-04 11:58:29.134635	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72580	2025-07-04 11:58:29.175454	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72583	2025-07-04 11:58:29.813739	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630309792,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72589	2025-07-04 11:58:39.45585	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72595	2025-07-04 11:58:52.03785	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72601	2025-07-04 11:58:53.413209	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72603	2025-07-04 11:59:00.748344	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72610	2025-07-04 11:59:11.765652	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72615	2025-07-04 11:59:16.81168	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630356789,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72618	2025-07-04 11:59:23.462461	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
72621	2025-07-04 11:59:23.640761	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
72624	2025-07-04 11:59:23.862251	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":688},"duration":1}
72626	2025-07-04 11:59:30.164833	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74127	2025-07-04 12:16:14.130633	DEBUG	Starting: getDocuments	database	\N
74133	2025-07-04 12:16:14.175609	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
74143	2025-07-04 12:16:14.2291	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74154	2025-07-04 12:16:14.464558	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
74162	2025-07-04 12:16:14.596954	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"537ms","forced":false}}
76006	2025-07-04 12:31:20.253671	DEBUG	Starting: getContractors	database	\N
76011	2025-07-04 12:31:20.307495	DEBUG	Starting: getInventory	database	{"meta":{}}
76024	2025-07-04 12:31:20.367392	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76033	2025-07-04 12:31:20.49497	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"1639ms","forced":false}}
76043	2025-07-04 12:31:20.556966	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"1646ms","forced":false}}
76055	2025-07-04 12:31:22.6615	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76062	2025-07-04 12:31:28.059206	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632288035,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
76070	2025-07-04 12:31:29.031006	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76073	2025-07-04 12:31:29.106607	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76083	2025-07-04 12:31:29.972707	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632289945,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76093	2025-07-04 12:31:32.432835	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76101	2025-07-04 12:31:32.470682	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
76113	2025-07-04 12:31:33.939298	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76896	2025-07-04 12:42:42.805331	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632962780,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76908	2025-07-04 12:42:43.710175	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76927	2025-07-04 12:42:45.637046	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76948	2025-07-04 12:42:48.893918	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76959	2025-07-04 12:42:51.925162	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76964	2025-07-04 12:42:53.198584	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
76973	2025-07-04 12:43:14.593167	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76976	2025-07-04 12:43:14.6358	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632994613,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76979	2025-07-04 12:43:15.576492	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76987	2025-07-04 12:43:16.154689	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76999	2025-07-04 12:43:16.723851	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77003	2025-07-04 12:43:16.806637	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77006	2025-07-04 12:43:17.308827	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77013	2025-07-04 12:43:17.726485	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72510	2025-07-04 11:58:18.799932	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
72514	2025-07-04 11:58:19.009665	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":157227},"duration":152}
72517	2025-07-04 11:58:24.572774	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72522	2025-07-04 11:58:25.352328	DEBUG	Starting: getDocuments	database	\N
72540	2025-07-04 11:58:26.163353	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72550	2025-07-04 11:58:27.438741	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72554	2025-07-04 11:58:27.480141	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":52}
72557	2025-07-04 11:58:28.139754	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72563	2025-07-04 11:58:28.585376	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72569	2025-07-04 11:58:28.62479	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
72581	2025-07-04 11:58:29.175674	INFO	Performance: getDocuments	database	{"duration":42}
72584	2025-07-04 11:58:29.814426	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72590	2025-07-04 11:58:39.462761	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72593	2025-07-04 11:58:52.037427	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72599	2025-07-04 11:58:53.412063	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72605	2025-07-04 11:59:00.75276	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630340726,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72607	2025-07-04 11:59:11.764526	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72612	2025-07-04 11:59:16.810311	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72619	2025-07-04 11:59:23.46282	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
72622	2025-07-04 11:59:23.683748	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
72623	2025-07-04 11:59:23.859628	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
72625	2025-07-04 11:59:30.164024	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
74128	2025-07-04 12:16:14.158319	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74138	2025-07-04 12:16:14.201495	DEBUG	Starting: getInventory	database	{"meta":{}}
74148	2025-07-04 12:16:14.462364	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
74157	2025-07-04 12:16:14.59489	INFO	Performance: getSuppliers	database	{"duration":530}
74166	2025-07-04 12:16:14.652437	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"1011ms","forced":false}}
74174	2025-07-04 12:16:17.109723	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74181	2025-07-04 12:16:24.432292	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
74190	2025-07-04 12:16:25.440077	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
76007	2025-07-04 12:31:20.3051	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76017	2025-07-04 12:31:20.363793	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
76027	2025-07-04 12:31:20.491977	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
76037	2025-07-04 12:31:20.554744	INFO	Performance: getInventory	database	{"meta":{},"duration":1637}
76046	2025-07-04 12:31:20.614722	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76054	2025-07-04 12:31:22.65851	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76058	2025-07-04 12:31:28.057138	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
76063	2025-07-04 12:31:29.02722	DEBUG	Starting: getDocuments	database	\N
76077	2025-07-04 12:31:29.970166	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76096	2025-07-04 12:31:32.435747	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76115	2025-07-04 12:31:33.942212	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76118	2025-07-04 12:31:33.98703	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632293969,"responseTime":48,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76897	2025-07-04 12:42:42.880323	INFO	Performance: getDocuments	database	{"duration":76}
76906	2025-07-04 12:42:43.709215	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76923	2025-07-04 12:42:45.596023	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76930	2025-07-04 12:42:45.66817	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
76947	2025-07-04 12:42:48.892167	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76958	2025-07-04 12:42:51.923784	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76961	2025-07-04 12:42:51.965033	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
76962	2025-07-04 12:42:53.161795	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76969	2025-07-04 12:43:14.591876	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632994569,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76980	2025-07-04 12:43:16.1526	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77015	2025-07-04 12:43:17.726971	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77022	2025-07-04 12:43:18.250933	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77030	2025-07-04 12:43:18.3329	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":75}
77032	2025-07-04 12:43:18.902457	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77416	2025-07-04 12:48:00.607296	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72519	2025-07-04 11:58:24.689926	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72525	2025-07-04 11:58:25.391913	INFO	Performance: getDocuments	database	{"duration":42}
72537	2025-07-04 11:58:26.162149	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72562	2025-07-04 11:58:28.585187	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72575	2025-07-04 11:58:29.134301	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630309113,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72579	2025-07-04 11:58:29.17516	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":45}
72585	2025-07-04 11:58:29.814695	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72588	2025-07-04 11:58:39.45564	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630319433,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72594	2025-07-04 11:58:52.037679	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630332014,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72597	2025-07-04 11:58:53.41139	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630333388,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72604	2025-07-04 11:59:00.752229	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72608	2025-07-04 11:59:11.765188	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630351744,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72614	2025-07-04 11:59:16.81131	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72627	2025-07-04 11:59:30.17028	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74129	2025-07-04 12:16:14.166677	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
74139	2025-07-04 12:16:14.203033	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
74150	2025-07-04 12:16:14.462913	INFO	Performance: getInventory	database	{"meta":{},"duration":521}
74167	2025-07-04 12:16:14.652774	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"955ms","forced":false}}
74173	2025-07-04 12:16:17.10878	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74180	2025-07-04 12:16:24.431331	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76008	2025-07-04 12:31:20.305017	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
76018	2025-07-04 12:31:20.364633	DEBUG	Starting: getWarehouses	database	\N
76028	2025-07-04 12:31:20.492403	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"1635ms","forced":false}}
76036	2025-07-04 12:31:20.554322	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76045	2025-07-04 12:31:20.60938	INFO	Performance: getDocuments	database	{"duration":1888}
76053	2025-07-04 12:31:22.658366	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76066	2025-07-04 12:31:29.029076	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76075	2025-07-04 12:31:29.970272	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":3}
76085	2025-07-04 12:31:30.011292	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632289992,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76087	2025-07-04 12:31:31.024638	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76088	2025-07-04 12:31:31.108449	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":83}
76090	2025-07-04 12:31:32.429482	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
76104	2025-07-04 12:31:32.543429	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76106	2025-07-04 12:31:33.109666	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76107	2025-07-04 12:31:33.20177	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":92}
76109	2025-07-04 12:31:33.936748	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76901	2025-07-04 12:42:42.925043	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76903	2025-07-04 12:42:43.70864	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76922	2025-07-04 12:42:45.595852	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76926	2025-07-04 12:42:45.635862	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
76975	2025-07-04 12:43:14.633884	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76978	2025-07-04 12:43:15.57584	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76984	2025-07-04 12:43:16.154205	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76991	2025-07-04 12:43:16.193704	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632996174,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77002	2025-07-04 12:43:16.802246	INFO	Performance: getDocuments	database	{"duration":82}
77004	2025-07-04 12:43:17.268854	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77010	2025-07-04 12:43:17.725928	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632997702,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77026	2025-07-04 12:43:18.252566	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77029	2025-07-04 12:43:18.332308	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77039	2025-07-04 12:43:18.904456	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77418	2025-07-04 12:48:00.613023	DEBUG	Starting: getProducts	database	\N
77427	2025-07-04 12:48:00.650418	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77437	2025-07-04 12:48:00.68683	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
72527	2025-07-04 11:58:25.478153	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630305332,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72535	2025-07-04 11:58:26.161598	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72549	2025-07-04 11:58:27.438127	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72566	2025-07-04 11:58:28.588315	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72572	2025-07-04 11:58:29.133527	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74130	2025-07-04 12:16:14.174075	DEBUG	Starting: getWarehouses	database	\N
74142	2025-07-04 12:16:14.212088	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":28845}}
74149	2025-07-04 12:16:14.462582	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"527ms","forced":false}}
74160	2025-07-04 12:16:14.596126	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
74169	2025-07-04 12:16:14.654534	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"1010ms","forced":false}}
74172	2025-07-04 12:16:17.105966	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
74184	2025-07-04 12:16:24.434814	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74189	2025-07-04 12:16:25.438825	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76009	2025-07-04 12:31:20.306672	DEBUG	Starting: getSuppliers	database	\N
76022	2025-07-04 12:31:20.3659	DEBUG	Starting: getShipments	database	\N
76034	2025-07-04 12:31:20.495161	INFO	Performance: getContractors	database	{"duration":1634}
76042	2025-07-04 12:31:20.55661	INFO	Performance: getInventory	database	{"meta":{},"duration":1641}
76082	2025-07-04 12:31:29.972501	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76097	2025-07-04 12:31:32.436263	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76117	2025-07-04 12:31:33.944025	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76913	2025-07-04 12:42:43.826271	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76916	2025-07-04 12:42:44.571105	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76925	2025-07-04 12:42:45.629985	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76972	2025-07-04 12:43:14.592938	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76974	2025-07-04 12:43:14.634006	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":40}
76977	2025-07-04 12:43:15.536204	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76990	2025-07-04 12:43:16.193211	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
76993	2025-07-04 12:43:16.71852	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77017	2025-07-04 12:43:17.76531	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
77021	2025-07-04 12:43:18.248733	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77036	2025-07-04 12:43:18.903511	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632998882,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77417	2025-07-04 12:48:00.612693	DEBUG	Starting: getWarehouses	database	\N
77429	2025-07-04 12:48:00.65334	DEBUG	Starting: getShipments	database	\N
77438	2025-07-04 12:48:00.689023	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"505ms","forced":false}}
77447	2025-07-04 12:48:00.732503	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"511ms","forced":false}}
77457	2025-07-04 12:48:00.942701	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":624,"duration":"833ms","forced":false}}
77459	2025-07-04 12:48:03.888953	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":8}
77475	2025-07-04 12:48:14.336653	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
77480	2025-07-04 12:48:14.456704	INFO	Shipment created	app	{"meta":{"shipmentId":57,"orderId":1}}
77493	2025-07-04 12:48:14.750307	INFO	Order not found	database	{"meta":{"operation":"getOrder","module":"storage","orderId":1}}
77516	2025-07-04 12:48:15.064436	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77532	2025-07-04 12:48:31.456273	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77549	2025-07-04 12:48:32.5243	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77584	2025-07-04 12:48:56.413907	DEBUG	Starting: getDocuments	database	\N
77600	2025-07-04 12:48:57.108727	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633337087,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77608	2025-07-04 12:48:59.448136	DEBUG	getInventorySummary completed	app	{"meta":{"duration":"37ms","rowCount":1,"service":"materialized"}}
77613	2025-07-04 12:49:12.682414	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77767	2025-07-04 13:41:55.793654	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77777	2025-07-04 13:41:55.832867	INFO	Performance: getShipments	database	{"duration":310}
77783	2025-07-04 13:41:55.872233	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"409ms","forced":false}}
77789	2025-07-04 13:42:00.892142	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":7}
77802	2025-07-04 13:50:26.925178	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77841	2025-07-04 13:50:33.279573	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":24}
77846	2025-07-04 13:50:34.613018	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77849	2025-07-04 13:50:35.265445	INFO	Performance: getDocuments	database	{"duration":21}
72528	2025-07-04 11:58:25.495504	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72536	2025-07-04 11:58:26.161841	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72552	2025-07-04 11:58:27.43919	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72561	2025-07-04 11:58:28.584377	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72568	2025-07-04 11:58:28.623927	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630308604,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72574	2025-07-04 11:58:29.13433	DEBUG	Starting: getDocuments	database	\N
72578	2025-07-04 11:58:29.17499	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72582	2025-07-04 11:58:29.812073	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72587	2025-07-04 11:58:39.455336	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72592	2025-07-04 11:58:52.036513	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72598	2025-07-04 11:58:53.411853	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72602	2025-07-04 11:59:00.748138	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72609	2025-07-04 11:59:11.765407	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72613	2025-07-04 11:59:16.811019	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72617	2025-07-04 11:59:23.461699	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72628	2025-07-04 11:59:30.170448	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74131	2025-07-04 12:16:14.174537	DEBUG	Starting: getContractors	database	\N
74140	2025-07-04 12:16:14.211407	DEBUG	Starting: getShipments	database	\N
74151	2025-07-04 12:16:14.46313	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74158	2025-07-04 12:16:14.595717	INFO	Performance: getContractors	database	{"duration":534}
74168	2025-07-04 12:16:14.652937	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74178	2025-07-04 12:16:17.305819	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":499110},"duration":192}
74185	2025-07-04 12:16:24.464864	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
74188	2025-07-04 12:16:25.436931	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
76010	2025-07-04 12:31:20.30664	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
76023	2025-07-04 12:31:20.366604	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":32183}}
76032	2025-07-04 12:31:20.494089	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
76040	2025-07-04 12:31:20.556349	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76069	2025-07-04 12:31:29.030688	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76072	2025-07-04 12:31:29.105704	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76081	2025-07-04 12:31:29.972089	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76092	2025-07-04 12:31:32.430957	DEBUG	Starting: getShipments	database	\N
76100	2025-07-04 12:31:32.469807	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
76112	2025-07-04 12:31:33.939124	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77024	2025-07-04 12:43:18.251605	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77038	2025-07-04 12:43:18.903835	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77419	2025-07-04 12:48:00.616052	DEBUG	Starting: getContractors	database	\N
77428	2025-07-04 12:48:00.652997	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":2092}}
77446	2025-07-04 12:48:00.732282	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"516ms","forced":false}}
77456	2025-07-04 12:48:00.942756	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
77466	2025-07-04 12:48:04.168936	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1173050},"duration":265}
77467	2025-07-04 12:48:14.110951	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77470	2025-07-04 12:48:14.294408	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77483	2025-07-04 12:48:14.462328	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77494	2025-07-04 12:48:14.750655	INFO	Performance: PUT /shipments/57	api	{"meta":{"statusCode":200,"responseSize":181},"duration":285}
77521	2025-07-04 12:48:15.108018	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
77530	2025-07-04 12:48:31.455853	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77552	2025-07-04 12:48:32.524976	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77570	2025-07-04 12:48:46.025815	INFO	Shipment updated	app	{"meta":{"shipmentId":57,"updatedFields":["status"]}}
77575	2025-07-04 12:48:52.293318	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77578	2025-07-04 12:48:52.332132	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
77588	2025-07-04 12:48:56.418606	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77591	2025-07-04 12:48:56.489796	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77597	2025-07-04 12:48:57.107644	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633337083,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77612	2025-07-04 12:49:12.681999	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633352662,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77803	2025-07-04 13:50:26.939003	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
72529	2025-07-04 11:58:25.515303	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72541	2025-07-04 11:58:26.199029	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"45ms","rowCount":0}}
72547	2025-07-04 11:58:27.436638	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72560	2025-07-04 11:58:28.583182	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72570	2025-07-04 11:58:29.13307	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74132	2025-07-04 12:16:14.17489	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
74141	2025-07-04 12:16:14.211902	DEBUG	Starting: getProducts	database	\N
74152	2025-07-04 12:16:14.463339	INFO	Performance: getWarehouses	database	{"duration":527}
74159	2025-07-04 12:16:14.595939	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"534ms","forced":false}}
74170	2025-07-04 12:16:14.654465	INFO	Performance: getDocuments	database	{"duration":1003}
74171	2025-07-04 12:16:17.105592	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74186	2025-07-04 12:16:24.633966	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":500874},"duration":191}
74187	2025-07-04 12:16:25.436572	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76012	2025-07-04 12:31:20.307936	DEBUG	Starting: getInventory	database	{"meta":{}}
76020	2025-07-04 12:31:20.365512	DEBUG	Starting: getProducts	database	\N
76030	2025-07-04 12:31:20.493433	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"1637ms","forced":false}}
76038	2025-07-04 12:31:20.555935	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"1643ms","forced":false}}
76048	2025-07-04 12:31:20.615059	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"1895ms","forced":false}}
76057	2025-07-04 12:31:22.921663	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":881399},"duration":242}
76059	2025-07-04 12:31:28.057802	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
76065	2025-07-04 12:31:29.028402	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76080	2025-07-04 12:31:29.971122	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76098	2025-07-04 12:31:32.43656	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76116	2025-07-04 12:31:33.943294	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76120	2025-07-04 12:31:33.988686	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":46}
77043	2025-07-04 12:44:09.243556	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77063	2025-07-04 12:44:11.664262	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
77071	2025-07-04 12:44:12.620971	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77089	2025-07-04 12:44:36.91223	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77092	2025-07-04 12:44:36.953725	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633076935,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77420	2025-07-04 12:48:00.616868	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
77433	2025-07-04 12:48:00.658015	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
77442	2025-07-04 12:48:00.694725	INFO	Performance: getInventory	database	{"meta":{},"duration":504}
77451	2025-07-04 12:48:00.734022	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"517ms","forced":false}}
77462	2025-07-04 12:48:03.89403	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77472	2025-07-04 12:48:14.295856	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77482	2025-07-04 12:48:14.457045	INFO	Shipment items created	database	{"meta":{"shipmentId":57,"itemsCount":1}}
77503	2025-07-04 12:48:14.801395	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"42ms","rowCount":1}}
77512	2025-07-04 12:48:15.059426	INFO	Inventory cache invalidated after shipment status change	app	{"meta":{"shipmentId":57,"oldStatus":"shipped","newStatus":"draft"}}
77535	2025-07-04 12:48:31.456882	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77541	2025-07-04 12:48:31.988678	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77548	2025-07-04 12:48:32.524069	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77587	2025-07-04 12:48:56.418416	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77593	2025-07-04 12:48:56.490152	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77594	2025-07-04 12:48:57.103868	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77621	2025-07-04 12:49:12.683996	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77804	2025-07-04 13:50:26.93966	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77812	2025-07-04 13:50:27.96483	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":58}
77818	2025-07-04 13:50:28.017424	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":101}
77823	2025-07-04 13:50:31.518198	INFO	Inventory cache invalidated after multiple document deletion	api	{"meta":{"deletedCount":1}}
77825	2025-07-04 13:50:31.729941	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77832	2025-07-04 13:50:32.515706	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77835	2025-07-04 13:50:32.540919	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":24}
77836	2025-07-04 13:50:33.257839	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72530	2025-07-04 11:58:25.522732	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":44}
72533	2025-07-04 11:58:26.160468	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72542	2025-07-04 11:58:26.200801	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630306181,"responseTime":49,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72544	2025-07-04 11:58:26.817316	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72545	2025-07-04 11:58:26.859156	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
72548	2025-07-04 11:58:27.436937	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72559	2025-07-04 11:58:28.583508	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72571	2025-07-04 11:58:29.133327	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74134	2025-07-04 12:16:14.175561	DEBUG	Starting: getSuppliers	database	\N
74144	2025-07-04 12:16:14.229409	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
74153	2025-07-04 12:16:14.46437	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"529ms","forced":false}}
74161	2025-07-04 12:16:14.596703	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
76013	2025-07-04 12:31:20.308319	DEBUG	Starting: getDocuments	database	\N
76021	2025-07-04 12:31:20.365648	INFO	Performance: getShipments	database	{"duration":1597}
76031	2025-07-04 12:31:20.493631	INFO	Performance: getSuppliers	database	{"duration":1635}
76039	2025-07-04 12:31:20.556189	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76049	2025-07-04 12:31:20.615186	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"1950ms","forced":false}}
76052	2025-07-04 12:31:22.658153	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76061	2025-07-04 12:31:28.057985	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":2}
76064	2025-07-04 12:31:29.028179	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76084	2025-07-04 12:31:30.00811	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
76091	2025-07-04 12:31:32.430268	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
76102	2025-07-04 12:31:32.472465	INFO	Performance: getShipments	database	{"duration":38}
76111	2025-07-04 12:31:33.93751	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632293916,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77044	2025-07-04 12:44:09.249419	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77055	2025-07-04 12:44:11.626966	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77064	2025-07-04 12:44:11.666923	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
77068	2025-07-04 12:44:12.187908	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
77070	2025-07-04 12:44:12.62057	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77086	2025-07-04 12:44:36.911753	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77422	2025-07-04 12:48:00.618755	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
77430	2025-07-04 12:48:00.655015	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
77439	2025-07-04 12:48:00.690726	INFO	Performance: getSuppliers	database	{"duration":502}
77448	2025-07-04 12:48:00.732669	INFO	Performance: getContractors	database	{"duration":512}
77485	2025-07-04 12:48:14.463474	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77491	2025-07-04 12:48:14.712108	INFO	Shipment updated via service	app	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"shipped"}}
77499	2025-07-04 12:48:14.758457	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77504	2025-07-04 12:48:14.801999	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
77513	2025-07-04 12:48:15.059841	INFO	Shipment updated	app	{"meta":{"shipmentId":57,"updatedFields":["status"]}}
77534	2025-07-04 12:48:31.456725	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633311435,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77539	2025-07-04 12:48:31.87425	INFO	POST /orders/create	api	{"meta":{"method":"POST","url":"/orders/create","bodySize":240}}
77540	2025-07-04 12:48:31.912564	INFO	Начинаем транзакцию создания заказа с резервами	app	{"meta":{"service":"transaction"}}
77542	2025-07-04 12:48:32.02655	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77550	2025-07-04 12:48:32.524251	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633312499,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77573	2025-07-04 12:48:46.026576	INFO	Performance: PUT /shipments/57	api	{"meta":{"statusCode":200,"responseSize":182},"duration":522}
77576	2025-07-04 12:48:52.293475	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77579	2025-07-04 12:48:52.33236	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
77582	2025-07-04 12:48:56.412997	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77598	2025-07-04 12:48:57.108395	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77605	2025-07-04 12:48:59.410529	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/:all"}}
77616	2025-07-04 12:49:12.682885	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77805	2025-07-04 13:50:26.945935	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77810	2025-07-04 13:50:27.922889	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77814	2025-07-04 13:50:27.964779	INFO	Retrieved all warehouses	api	{"meta":{"count":10,"entity":"Warehouse"}}
77828	2025-07-04 13:50:31.762747	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":28}
72531	2025-07-04 11:58:25.527898	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72532	2025-07-04 11:58:26.157368	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72543	2025-07-04 11:58:26.201992	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":48}
72546	2025-07-04 11:58:26.862143	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72553	2025-07-04 11:58:27.479654	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72555	2025-07-04 11:58:28.101793	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72564	2025-07-04 11:58:28.586488	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630308561,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72577	2025-07-04 11:58:29.135761	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72586	2025-07-04 11:58:29.820226	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72591	2025-07-04 11:58:39.463141	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72596	2025-07-04 11:58:52.037999	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72600	2025-07-04 11:58:53.413045	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72606	2025-07-04 11:59:00.753277	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72611	2025-07-04 11:59:11.765952	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72616	2025-07-04 11:59:16.812792	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72620	2025-07-04 11:59:23.617811	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":178926},"duration":156}
72631	2025-07-04 11:59:30.328913	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":181256},"duration":159}
74135	2025-07-04 12:16:14.178893	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
74145	2025-07-04 12:16:14.232055	INFO	Performance: getInventory	database	{"meta":{},"duration":512}
74155	2025-07-04 12:16:14.465104	INFO	Performance: getProducts	database	{"duration":531}
74163	2025-07-04 12:16:14.597679	INFO	Performance: getShipments	database	{"duration":504}
74175	2025-07-04 12:16:17.120686	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74182	2025-07-04 12:16:24.433282	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74191	2025-07-04 12:16:25.443227	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74193	2025-07-04 12:16:35.646084	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
74195	2025-07-04 12:16:46.424515	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74197	2025-07-04 12:16:57.247706	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74198	2025-07-04 12:16:57.304239	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74205	2025-07-04 12:17:02.968378	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":505168},"duration":294}
74212	2025-07-04 12:17:03.798092	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74216	2025-07-04 12:17:03.886525	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74227	2025-07-04 12:17:04.68369	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74231	2025-07-04 12:17:04.723905	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631424704,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74233	2025-07-04 12:17:05.557424	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74235	2025-07-04 12:17:05.630256	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":74}
74237	2025-07-04 12:17:06.534168	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74247	2025-07-04 12:17:06.581018	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631426555,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74257	2025-07-04 12:17:07.44105	INFO	Performance: getDocuments	database	{"duration":92}
74261	2025-07-04 12:17:17.308479	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631437286,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74277	2025-07-04 12:17:22.476244	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74290	2025-07-04 12:17:43.870829	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74303	2025-07-04 12:17:45.878518	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74322	2025-07-04 12:17:46.677086	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74335	2025-07-04 12:17:47.725969	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74336	2025-07-04 12:17:47.806693	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
74340	2025-07-04 12:17:48.317153	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74358	2025-07-04 12:17:54.575961	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76014	2025-07-04 12:31:20.307762	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76019	2025-07-04 12:31:20.365352	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
76029	2025-07-04 12:31:20.4929	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
76047	2025-07-04 12:31:20.61488	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"1949ms","forced":false}}
76050	2025-07-04 12:31:22.657621	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
76068	2025-07-04 12:31:29.029824	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632289008,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76074	2025-07-04 12:31:29.107254	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":80}
76078	2025-07-04 12:31:29.970634	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72629	2025-07-04 11:59:30.287352	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":688},"duration":1}
74136	2025-07-04 12:16:14.179959	DEBUG	Starting: getInventory	database	{"meta":{}}
74146	2025-07-04 12:16:14.232227	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74164	2025-07-04 12:16:14.597873	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74177	2025-07-04 12:16:17.164232	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":49}
74179	2025-07-04 12:16:24.428769	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76015	2025-07-04 12:31:20.308885	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76025	2025-07-04 12:31:20.388357	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"1632ms","forced":false}}
76041	2025-07-04 12:31:20.556486	INFO	Performance: getProducts	database	{"duration":1672}
76056	2025-07-04 12:31:22.703261	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
76060	2025-07-04 12:31:28.057778	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
76071	2025-07-04 12:31:29.104908	INFO	Performance: getDocuments	database	{"duration":78}
76079	2025-07-04 12:31:29.970845	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76086	2025-07-04 12:31:30.011598	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
76089	2025-07-04 12:31:31.110577	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76103	2025-07-04 12:31:32.473271	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76105	2025-07-04 12:31:32.544469	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":106}
76108	2025-07-04 12:31:33.204506	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76110	2025-07-04 12:31:33.937322	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77045	2025-07-04 12:44:09.251858	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633049093,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77052	2025-07-04 12:44:09.325176	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":204}
77057	2025-07-04 12:44:11.628318	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633051603,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77065	2025-07-04 12:44:11.668258	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633051649,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77067	2025-07-04 12:44:12.150337	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77080	2025-07-04 12:44:12.660881	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
77090	2025-07-04 12:44:36.913402	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633076889,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77423	2025-07-04 12:48:00.619211	DEBUG	Starting: getSuppliers	database	\N
77432	2025-07-04 12:48:00.656851	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77441	2025-07-04 12:48:00.692133	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"507ms","forced":false}}
77450	2025-07-04 12:48:00.733031	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
77458	2025-07-04 12:48:00.943536	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"835ms","forced":false}}
77460	2025-07-04 12:48:03.889431	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77487	2025-07-04 12:48:14.463881	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633294440,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77497	2025-07-04 12:48:14.751896	INFO	Inventory cache invalidated after shipment status change	app	{"meta":{"shipmentId":57,"oldStatus":"draft","newStatus":"shipped"}}
77515	2025-07-04 12:48:15.060536	INFO	Performance: PUT /shipments/57	api	{"meta":{"statusCode":200,"responseSize":179},"duration":253}
77537	2025-07-04 12:48:31.457338	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77554	2025-07-04 12:48:32.525672	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77560	2025-07-04 12:48:38.715995	INFO	Performance: PUT /shipments/57	api	{"meta":{"statusCode":200,"responseSize":180},"duration":221}
77562	2025-07-04 12:48:45.505993	INFO	PUT /shipments/57	api	{"meta":{"method":"PUT","url":"/shipments/57","bodySize":20}}
77563	2025-07-04 12:48:45.578103	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":57,"itemsCount":1}}
77564	2025-07-04 12:48:45.689574	INFO	Shipment updated	database	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"shipped"}}
77566	2025-07-04 12:48:45.740344	INFO	Shipment updated via service	app	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"shipped"}}
77571	2025-07-04 12:48:46.026191	INFO	Shipment writeoff completed	database	{"meta":{"operation":"processShipmentWriteoff","module":"storage","shipmentId":57,"itemsCount":1}}
77577	2025-07-04 12:48:52.293998	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77581	2025-07-04 12:48:52.332951	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633332313,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77589	2025-07-04 12:48:56.462713	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77599	2025-07-04 12:48:57.108583	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77619	2025-07-04 12:49:12.683635	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77806	2025-07-04 13:50:26.955345	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77816	2025-07-04 13:50:28.017028	INFO	Performance: getDocuments	database	{"duration":98}
77819	2025-07-04 13:50:31.169867	INFO	POST /documents/delete-multiple	api	{"meta":{"method":"POST","url":"/documents/delete-multiple","bodySize":21}}
77822	2025-07-04 13:50:31.487289	INFO	Inventory cache invalidated after document deletion	api	{"meta":{"documentId":305}}
72630	2025-07-04 11:59:30.288123	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74137	2025-07-04 12:16:14.18098	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
74147	2025-07-04 12:16:14.235248	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"519ms","forced":false}}
74156	2025-07-04 12:16:14.467554	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"532ms","forced":false}}
74165	2025-07-04 12:16:14.598287	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"539ms","forced":false}}
74176	2025-07-04 12:16:17.120868	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74183	2025-07-04 12:16:24.434575	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74192	2025-07-04 12:16:25.484896	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":43}
74194	2025-07-04 12:16:35.646438	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74196	2025-07-04 12:16:46.425124	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74200	2025-07-04 12:16:57.478587	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":503807},"duration":218}
74202	2025-07-04 12:17:02.537387	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74204	2025-07-04 12:17:02.659853	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74213	2025-07-04 12:17:03.798282	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74217	2025-07-04 12:17:03.886729	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74228	2025-07-04 12:17:04.683907	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74244	2025-07-04 12:17:06.536878	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74255	2025-07-04 12:17:07.353508	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74259	2025-07-04 12:17:07.445074	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":94}
74262	2025-07-04 12:17:17.308919	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74279	2025-07-04 12:17:22.476946	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74282	2025-07-04 12:17:22.554779	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74291	2025-07-04 12:17:43.871013	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74304	2025-07-04 12:17:45.879006	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631465856,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74312	2025-07-04 12:17:45.939806	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":55}
74323	2025-07-04 12:17:46.677271	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631466651,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74334	2025-07-04 12:17:47.723777	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74346	2025-07-04 12:17:48.319764	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631468295,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74356	2025-07-04 12:17:54.573939	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76016	2025-07-04 12:31:20.336626	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
76026	2025-07-04 12:31:20.486593	INFO	Performance: getWarehouses	database	{"duration":1633}
76035	2025-07-04 12:31:20.553933	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76044	2025-07-04 12:31:20.609027	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"1672ms","forced":false}}
76051	2025-07-04 12:31:22.657971	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76067	2025-07-04 12:31:29.02943	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76076	2025-07-04 12:31:29.970038	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76094	2025-07-04 12:31:32.434369	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632292414,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76099	2025-07-04 12:31:32.469401	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
76114	2025-07-04 12:31:33.939758	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77046	2025-07-04 12:44:09.25271	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77061	2025-07-04 12:44:11.630323	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77077	2025-07-04 12:44:12.623166	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633052601,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77085	2025-07-04 12:44:36.911547	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77424	2025-07-04 12:48:00.621799	DEBUG	Starting: getInventory	database	{"meta":{}}
77434	2025-07-04 12:48:00.658319	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77443	2025-07-04 12:48:00.695701	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77452	2025-07-04 12:48:00.735096	INFO	Performance: getDocuments	database	{"duration":618}
77464	2025-07-04 12:48:03.894889	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77473	2025-07-04 12:48:14.332403	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
77486	2025-07-04 12:48:14.463718	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77807	2025-07-04 13:50:26.967384	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":158}
72632	2025-07-04 11:59:30.333386	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":159}
74199	2025-07-04 12:16:57.418764	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74201	2025-07-04 12:17:02.536524	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74203	2025-07-04 12:17:02.657128	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
74211	2025-07-04 12:17:03.789983	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74229	2025-07-04 12:17:04.720108	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
74241	2025-07-04 12:17:06.53627	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74253	2025-07-04 12:17:07.353009	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74267	2025-07-04 12:17:17.310904	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74271	2025-07-04 12:17:17.387293	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":76}
74281	2025-07-04 12:17:22.554467	INFO	Performance: getDocuments	database	{"duration":80}
74289	2025-07-04 12:17:43.870392	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74311	2025-07-04 12:17:45.938218	INFO	Performance: getShipments	database	{"duration":52}
74321	2025-07-04 12:17:46.676461	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74333	2025-07-04 12:17:47.723122	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":3}
74345	2025-07-04 12:17:48.31957	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74349	2025-07-04 12:17:48.359	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631468339,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74351	2025-07-04 12:17:54.571621	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76095	2025-07-04 12:31:32.435194	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76119	2025-07-04 12:31:33.98814	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
77047	2025-07-04 12:44:09.254696	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77056	2025-07-04 12:44:11.627216	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77073	2025-07-04 12:44:12.6224	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77079	2025-07-04 12:44:12.660525	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":43}
77088	2025-07-04 12:44:36.912108	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77093	2025-07-04 12:44:36.95396	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
77425	2025-07-04 12:48:00.622688	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77435	2025-07-04 12:48:00.660119	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"502ms","forced":false}}
77444	2025-07-04 12:48:00.698294	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77453	2025-07-04 12:48:00.738091	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77463	2025-07-04 12:48:03.894468	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77471	2025-07-04 12:48:14.295643	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77476	2025-07-04 12:48:14.337484	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":42}
77479	2025-07-04 12:48:14.45645	INFO	Shipment created via service	app	{"meta":{"shipmentId":57,"orderId":1,"status":"draft"}}
77488	2025-07-04 12:48:14.494684	INFO	PUT /shipments/57	api	{"meta":{"method":"PUT","url":"/shipments/57","bodySize":20}}
77489	2025-07-04 12:48:14.567279	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":57,"itemsCount":1}}
77490	2025-07-04 12:48:14.675878	INFO	Shipment updated	database	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"shipped"}}
77496	2025-07-04 12:48:14.751385	WARN	Order not found for shipment	app	{"meta":{"orderId":1}}
77506	2025-07-04 12:48:14.806889	INFO	PUT /shipments/57	api	{"meta":{"method":"PUT","url":"/shipments/57","bodySize":18}}
77507	2025-07-04 12:48:14.879268	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":57,"itemsCount":1}}
77508	2025-07-04 12:48:14.985364	INFO	Shipment updated	database	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"draft"}}
77514	2025-07-04 12:48:15.060359	WARN	Order not found for shipment	app	{"meta":{"orderId":1}}
77538	2025-07-04 12:48:31.457477	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77545	2025-07-04 12:48:32.109931	INFO	Performance: POST /orders/create	api	{"meta":{"statusCode":201,"responseSize":264},"duration":232}
77546	2025-07-04 12:48:32.520849	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77585	2025-07-04 12:48:56.414788	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77602	2025-07-04 12:48:57.109411	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77607	2025-07-04 12:48:59.410916	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/:all","method":"GET","url":"/api/inventory"}}
77610	2025-07-04 12:48:59.449448	INFO	Performance: GET /inventory	api	{"meta":{"statusCode":200,"responseSize":64},"duration":40}
77620	2025-07-04 12:49:12.683847	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633352658,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77808	2025-07-04 13:50:27.355771	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1246437},"duration":477}
77809	2025-07-04 13:50:27.920335	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77811	2025-07-04 13:50:27.964015	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77990	2025-07-04 14:00:36.077535	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
72633	2025-07-04 11:59:31.812164	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72639	2025-07-04 11:59:32.614916	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72645	2025-07-04 11:59:32.655934	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72651	2025-07-04 11:59:33.252659	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74206	2025-07-04 12:17:02.991832	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74210	2025-07-04 12:17:03.789808	DEBUG	Starting: getDocuments	database	\N
74223	2025-07-04 12:17:04.681049	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74238	2025-07-04 12:17:06.534478	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74252	2025-07-04 12:17:07.352194	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631427330,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74268	2025-07-04 12:17:17.385123	INFO	Performance: getDocuments	database	{"duration":74}
74274	2025-07-04 12:17:22.474001	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74284	2025-07-04 12:17:43.86421	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74293	2025-07-04 12:17:43.903608	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":44}
74300	2025-07-04 12:17:45.876382	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74313	2025-07-04 12:17:45.952003	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74315	2025-07-04 12:17:46.67437	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74342	2025-07-04 12:17:48.317499	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74354	2025-07-04 12:17:54.572822	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76121	2025-07-04 12:32:18.658315	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76122	2025-07-04 12:32:18.747654	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":227}
76124	2025-07-04 12:32:21.105258	INFO	POST /orders/delete-multiple	api	{"meta":{"method":"POST","url":"/orders/delete-multiple","bodySize":17}}
76125	2025-07-04 12:32:21.184287	DEBUG	Retrieved order by ID	api	{"meta":{"id":92,"found":true,"entity":"Order"}}
76130	2025-07-04 12:32:21.573104	INFO	Deleted order	api	{"meta":{"id":92,"entity":"Order"}}
76134	2025-07-04 12:32:21.965174	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76138	2025-07-04 12:32:25.162511	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76157	2025-07-04 12:32:26.590141	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76162	2025-07-04 12:32:26.628506	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":43}
76163	2025-07-04 12:32:27.186839	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76180	2025-07-04 12:32:27.864919	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632347842,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76186	2025-07-04 12:32:27.903918	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":43}
76196	2025-07-04 12:32:28.774821	INFO	Performance: getDocuments	database	{"duration":82}
76200	2025-07-04 12:32:46.348395	DEBUG	Starting: getDocument	database	\N
76204	2025-07-04 12:32:46.429327	DEBUG	Retrieved document by ID	api	{"meta":{"id":305,"found":true,"entity":"Document"}}
76209	2025-07-04 12:32:46.635843	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
76223	2025-07-04 12:32:47.668412	DEBUG	Starting: getDocuments	database	\N
76226	2025-07-04 12:32:47.747235	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76231	2025-07-04 12:32:48.281295	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
76233	2025-07-04 12:32:48.965981	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76253	2025-07-04 12:32:50.707851	DEBUG	Starting: getDocuments	database	\N
76257	2025-07-04 12:32:50.782014	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76261	2025-07-04 12:32:51.519461	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76274	2025-07-04 12:32:52.291015	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76287	2025-07-04 12:33:01.213075	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632381191,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76292	2025-07-04 12:33:01.29552	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":86}
76294	2025-07-04 12:33:10.738663	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76305	2025-07-04 12:33:10.777311	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":37}
76308	2025-07-04 12:33:13.175505	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76313	2025-07-04 12:33:13.669049	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76325	2025-07-04 12:33:14.180808	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632394159,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76339	2025-07-04 12:33:14.696978	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76352	2025-07-04 12:33:31.370986	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632411350,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76361	2025-07-04 12:33:31.410167	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":2,"responseSize":230}}
76371	2025-07-04 12:33:31.447957	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77048	2025-07-04 12:44:09.255386	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77059	2025-07-04 12:44:11.629971	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77075	2025-07-04 12:44:12.622762	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77084	2025-07-04 12:44:36.911415	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77426	2025-07-04 12:48:00.643834	DEBUG	Starting: getInventory	database	{"meta":{}}
72634	2025-07-04 11:59:31.812495	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630371791,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72638	2025-07-04 11:59:32.615011	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72653	2025-07-04 11:59:33.25318	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72658	2025-07-04 11:59:33.292545	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630373273,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72662	2025-07-04 11:59:33.897578	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72663	2025-07-04 11:59:33.936612	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
72665	2025-07-04 11:59:34.530487	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74207	2025-07-04 12:17:03.003623	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74209	2025-07-04 12:17:03.789418	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74214	2025-07-04 12:17:03.884799	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":100}
74225	2025-07-04 12:17:04.682563	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74239	2025-07-04 12:17:06.534676	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74246	2025-07-04 12:17:06.57511	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
74250	2025-07-04 12:17:07.350582	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74264	2025-07-04 12:17:17.3098	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74272	2025-07-04 12:17:22.474224	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74286	2025-07-04 12:17:43.867952	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631463843,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74305	2025-07-04 12:17:45.882011	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
74309	2025-07-04 12:17:45.935184	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
74316	2025-07-04 12:17:46.674798	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74348	2025-07-04 12:17:48.357298	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
74359	2025-07-04 12:17:54.606784	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76123	2025-07-04 12:32:18.748564	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76126	2025-07-04 12:32:21.184972	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":92,"itemsCount":1}}
76128	2025-07-04 12:32:21.432249	DEBUG	Retrieved order by ID	api	{"meta":{"id":92,"found":true,"entity":"Order"}}
76131	2025-07-04 12:32:21.573367	INFO	Inventory cache invalidated after order deletion	api	{"meta":{"orderId":92}}
76133	2025-07-04 12:32:21.929624	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76139	2025-07-04 12:32:25.165433	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632345138,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76158	2025-07-04 12:32:26.591319	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76170	2025-07-04 12:32:27.197789	DEBUG	Starting: getDocuments	database	\N
76174	2025-07-04 12:32:27.262019	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76183	2025-07-04 12:32:27.865651	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76191	2025-07-04 12:32:28.696315	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76195	2025-07-04 12:32:28.774437	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76205	2025-07-04 12:32:46.429865	INFO	Performance: getDocument	database	{"duration":80}
76210	2025-07-04 12:32:46.636461	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
76227	2025-07-04 12:32:47.747395	INFO	Performance: getDocuments	database	{"duration":78}
76232	2025-07-04 12:32:48.281532	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
76240	2025-07-04 12:32:49.237341	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":918466},"duration":254}
76245	2025-07-04 12:32:49.498258	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
76250	2025-07-04 12:32:50.703836	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76266	2025-07-04 12:32:51.525985	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76277	2025-07-04 12:32:52.292234	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76281	2025-07-04 12:32:52.359955	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76293	2025-07-04 12:33:01.295696	INFO	Performance: getDocuments	database	{"duration":83}
76300	2025-07-04 12:33:10.741939	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76317	2025-07-04 12:33:13.67329	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76328	2025-07-04 12:33:14.186856	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76331	2025-07-04 12:33:14.263586	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76340	2025-07-04 12:33:14.69718	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76348	2025-07-04 12:33:31.331342	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76355	2025-07-04 12:33:31.400671	INFO	POST /shipments/create	api	{"meta":{"method":"POST","url":"/shipments/create","bodySize":105}}
76366	2025-07-04 12:33:31.438078	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632411392,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77049	2025-07-04 12:44:09.256418	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77054	2025-07-04 12:44:09.330302	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72635	2025-07-04 11:59:31.813181	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72644	2025-07-04 11:59:32.616716	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72647	2025-07-04 11:59:32.657231	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":45}
72659	2025-07-04 11:59:33.292762	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":0}}
72668	2025-07-04 11:59:34.531613	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74208	2025-07-04 12:17:03.047806	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":385}
74215	2025-07-04 12:17:03.88543	INFO	Performance: getDocuments	database	{"duration":97}
74226	2025-07-04 12:17:04.683523	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74243	2025-07-04 12:17:06.536591	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74254	2025-07-04 12:17:07.353173	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74258	2025-07-04 12:17:07.443885	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74260	2025-07-04 12:17:17.308122	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74278	2025-07-04 12:17:22.47649	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74283	2025-07-04 12:17:22.555387	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74288	2025-07-04 12:17:43.870202	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74302	2025-07-04 12:17:45.878145	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74314	2025-07-04 12:17:45.955617	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":80}
74320	2025-07-04 12:17:46.676149	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74337	2025-07-04 12:17:47.807046	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74338	2025-07-04 12:17:48.316765	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74357	2025-07-04 12:17:54.575741	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631474552,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76127	2025-07-04 12:32:21.429927	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":92,"itemsCount":1}}
76129	2025-07-04 12:32:21.57263	INFO	Inventory cache invalidated after multiple order deletion	api	{"meta":{"deletedCount":1}}
76136	2025-07-04 12:32:25.160644	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76155	2025-07-04 12:32:26.588477	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76171	2025-07-04 12:32:27.259672	INFO	Performance: getDocuments	database	{"duration":70}
76176	2025-07-04 12:32:27.862768	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76212	2025-07-04 12:32:46.638614	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76216	2025-07-04 12:32:47.661943	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76252	2025-07-04 12:32:50.706088	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76255	2025-07-04 12:32:50.780189	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76258	2025-07-04 12:32:51.517795	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76295	2025-07-04 12:33:10.739208	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76304	2025-07-04 12:33:10.776001	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632390757,"responseTime":37,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76306	2025-07-04 12:33:13.135345	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76307	2025-07-04 12:33:13.174425	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
76310	2025-07-04 12:33:13.667253	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76322	2025-07-04 12:33:14.179429	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76334	2025-07-04 12:33:14.69528	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76356	2025-07-04 12:33:31.401521	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76368	2025-07-04 12:33:31.439642	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77050	2025-07-04 12:44:09.258535	DEBUG	Starting: getDocuments	database	\N
77053	2025-07-04 12:44:09.330072	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77060	2025-07-04 12:44:11.630137	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77076	2025-07-04 12:44:12.622921	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77083	2025-07-04 12:44:36.911244	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77436	2025-07-04 12:48:00.67942	INFO	Performance: getWarehouses	database	{"duration":502}
77445	2025-07-04 12:48:00.731385	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"510ms","forced":false}}
77454	2025-07-04 12:48:00.942023	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"627ms","forced":false}}
77465	2025-07-04 12:48:03.928978	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
77468	2025-07-04 12:48:14.111301	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77469	2025-07-04 12:48:14.294056	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77477	2025-07-04 12:48:14.367349	INFO	POST /shipments	api	{"meta":{"method":"POST","url":"/shipments","bodySize":121}}
77481	2025-07-04 12:48:14.456857	INFO	Shipment created	database	{"meta":{"shipmentId":57,"orderId":1,"status":"draft"}}
77500	2025-07-04 12:48:14.758931	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77502	2025-07-04 12:48:14.800966	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":46}
72636	2025-07-04 11:59:31.813498	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72641	2025-07-04 11:59:32.615949	DEBUG	Starting: getDocuments	database	\N
72656	2025-07-04 11:59:33.254836	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72660	2025-07-04 11:59:33.293204	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":43}
72666	2025-07-04 11:59:34.531205	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630374508,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74218	2025-07-04 12:17:03.906815	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631423767,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74222	2025-07-04 12:17:04.680514	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74245	2025-07-04 12:17:06.574296	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
74248	2025-07-04 12:17:07.350134	DEBUG	Starting: getDocuments	database	\N
74265	2025-07-04 12:17:17.310113	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74269	2025-07-04 12:17:17.385368	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74276	2025-07-04 12:17:22.474778	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74280	2025-07-04 12:17:22.554045	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":82}
74292	2025-07-04 12:17:43.902954	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
74301	2025-07-04 12:17:45.876689	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74317	2025-07-04 12:17:46.675368	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74325	2025-07-04 12:17:46.715265	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
74327	2025-07-04 12:17:47.214388	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74328	2025-07-04 12:17:47.30013	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":86}
74332	2025-07-04 12:17:47.721814	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74339	2025-07-04 12:17:48.316649	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74355	2025-07-04 12:17:54.573486	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
76132	2025-07-04 12:32:21.694493	INFO	Performance: POST /orders/delete-multiple	api	{"meta":{"statusCode":200,"responseSize":59},"duration":471}
76135	2025-07-04 12:32:21.965483	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76137	2025-07-04 12:32:25.162306	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76159	2025-07-04 12:32:26.593684	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632346568,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76167	2025-07-04 12:32:27.18934	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76181	2025-07-04 12:32:27.865123	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76193	2025-07-04 12:32:28.696597	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76214	2025-07-04 12:32:46.640157	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76218	2025-07-04 12:32:47.663616	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632367642,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76237	2025-07-04 12:32:48.970644	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
76244	2025-07-04 12:32:49.49707	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
76249	2025-07-04 12:32:50.703585	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76263	2025-07-04 12:32:51.519655	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76272	2025-07-04 12:32:52.290644	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632372265,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76284	2025-07-04 12:33:01.211815	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76297	2025-07-04 12:33:10.739823	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76315	2025-07-04 12:33:13.672088	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76324	2025-07-04 12:33:14.180688	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76332	2025-07-04 12:33:14.264198	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":87}
76338	2025-07-04 12:33:14.696785	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76343	2025-07-04 12:33:14.737189	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632394716,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76347	2025-07-04 12:33:31.331152	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76354	2025-07-04 12:33:31.399099	ERROR	POST /shipments/create - 404	api	{"meta":{"method":"POST","url":"/shipments/create","statusCode":404,"duration":2,"responseSize":78}}
76363	2025-07-04 12:33:31.436585	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77051	2025-07-04 12:44:09.323766	INFO	Performance: getDocuments	database	{"duration":203}
77058	2025-07-04 12:44:11.628609	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77074	2025-07-04 12:44:12.622572	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77091	2025-07-04 12:44:36.950785	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
77449	2025-07-04 12:48:00.732833	INFO	Performance: getProducts	database	{"duration":510}
77484	2025-07-04 12:48:14.463262	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77495	2025-07-04 12:48:14.750854	INFO	Shipment updated	app	{"meta":{"shipmentId":57,"updatedFields":["status"]}}
77517	2025-07-04 12:48:15.065284	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77523	2025-07-04 12:48:15.10976	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
77524	2025-07-04 12:48:23.446997	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72637	2025-07-04 11:59:31.815053	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72648	2025-07-04 11:59:32.65987	INFO	Performance: getDocuments	database	{"duration":43}
72657	2025-07-04 11:59:33.256122	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72670	2025-07-04 11:59:34.532702	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72677	2025-07-04 11:59:36.720819	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630376698,"responseTime":0,"endpoint":"/api/suppliers","cacheHit":true,"dbQueries":0}}
72682	2025-07-04 11:59:38.74523	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
72687	2025-07-04 11:59:40.671382	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72692	2025-07-04 11:59:54.036222	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72697	2025-07-04 11:59:56.656187	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72702	2025-07-04 11:59:59.532374	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72707	2025-07-04 12:00:17.946707	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72712	2025-07-04 12:00:19.45346	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72727	2025-07-04 12:00:20.122993	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72730	2025-07-04 12:00:20.166161	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
72732	2025-07-04 12:00:20.821111	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72740	2025-07-04 12:00:21.517598	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72750	2025-07-04 12:00:22.014349	DEBUG	Starting: getDocuments	database	\N
72759	2025-07-04 12:00:24.4061	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72775	2025-07-04 12:00:32.129487	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72779	2025-07-04 12:00:32.198371	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
72788	2025-07-04 12:00:34.150247	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72791	2025-07-04 12:00:34.193041	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
72804	2025-07-04 12:00:35.243846	INFO	Performance: getDocuments	database	{"duration":86}
72807	2025-07-04 12:00:36.238593	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72808	2025-07-04 12:00:38.399782	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72820	2025-07-04 12:00:38.43886	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
72823	2025-07-04 12:00:45.393276	INFO	POST /orders/create	api	{"meta":{"method":"POST","url":"/orders/create","bodySize":168}}
72827	2025-07-04 12:00:45.671839	INFO	Inventory cache invalidated after order creation with reserves	api	{"meta":{"orderId":90}}
72829	2025-07-04 12:00:45.902106	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72831	2025-07-04 12:00:45.996976	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":98}
72840	2025-07-04 12:00:46.535625	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72843	2025-07-04 12:00:46.576156	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
72844	2025-07-04 12:00:47.870591	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72846	2025-07-04 12:00:48.004022	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":136}
72850	2025-07-04 12:00:48.538113	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72889	2025-07-04 12:00:53.378411	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72902	2025-07-04 12:01:01.157103	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72906	2025-07-04 12:01:01.327411	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72913	2025-07-04 12:01:01.374817	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630461351,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72922	2025-07-04 12:01:01.723252	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72929	2025-07-04 12:01:01.769416	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630461746,"responseTime":57,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72932	2025-07-04 12:01:02.284361	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72939	2025-07-04 12:01:02.797638	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72943	2025-07-04 12:01:02.843966	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630462821,"responseTime":52,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72945	2025-07-04 12:01:10.538155	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72968	2025-07-04 12:01:11.13721	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
72971	2025-07-04 12:01:11.686475	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72976	2025-07-04 12:01:12.639208	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
73001	2025-07-04 12:01:15.256871	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73003	2025-07-04 12:01:15.334863	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
73016	2025-07-04 12:01:15.873674	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"44ms","rowCount":1}}
73026	2025-07-04 12:01:17.944784	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73029	2025-07-04 12:01:17.987619	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630477965,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73036	2025-07-04 12:01:22.509954	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74219	2025-07-04 12:17:03.907656	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
76140	2025-07-04 12:32:25.279139	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72640	2025-07-04 11:59:32.615487	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630372594,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72652	2025-07-04 11:59:33.253051	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72672	2025-07-04 11:59:34.572744	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72673	2025-07-04 11:59:36.718603	INFO	GET /suppliers	api	{"meta":{"method":"GET","url":"/suppliers","bodySize":2}}
72678	2025-07-04 11:59:38.743323	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":149},"duration":1}
72683	2025-07-04 11:59:40.669366	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72688	2025-07-04 11:59:54.031489	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72693	2025-07-04 11:59:56.654866	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72699	2025-07-04 11:59:59.529149	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72703	2025-07-04 12:00:17.944606	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72708	2025-07-04 12:00:19.451569	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72728	2025-07-04 12:00:20.1609	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":0}}
72737	2025-07-04 12:00:21.515431	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72747	2025-07-04 12:00:22.013773	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72761	2025-07-04 12:00:24.409258	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72768	2025-07-04 12:00:32.126635	DEBUG	Starting: getDocuments	database	\N
72783	2025-07-04 12:00:34.148824	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72790	2025-07-04 12:00:34.192784	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":84}}
72795	2025-07-04 12:00:35.155163	DEBUG	Starting: getDocuments	database	\N
72811	2025-07-04 12:00:38.401712	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72835	2025-07-04 12:00:46.534316	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72842	2025-07-04 12:00:46.575332	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630446555,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72853	2025-07-04 12:00:48.538693	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630448514,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72868	2025-07-04 12:00:51.222943	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72873	2025-07-04 12:00:51.392205	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72877	2025-07-04 12:00:51.534996	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630451514,"responseTime":1,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
72881	2025-07-04 12:00:52.46887	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72883	2025-07-04 12:00:52.54908	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
72884	2025-07-04 12:00:53.370534	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72910	2025-07-04 12:01:01.334472	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72914	2025-07-04 12:01:01.399953	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
72925	2025-07-04 12:01:01.724827	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72934	2025-07-04 12:01:02.794532	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72949	2025-07-04 12:01:10.539971	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630470519,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72953	2025-07-04 12:01:10.610225	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":75}
72964	2025-07-04 12:01:11.09305	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630471063,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72973	2025-07-04 12:01:12.63649	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
73000	2025-07-04 12:01:15.254869	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73002	2025-07-04 12:01:15.334279	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
73007	2025-07-04 12:01:15.829869	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73027	2025-07-04 12:01:17.98156	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
73031	2025-07-04 12:01:22.508421	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630482483,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74220	2025-07-04 12:17:03.908198	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74224	2025-07-04 12:17:04.682198	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74230	2025-07-04 12:17:04.722215	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":43}
74240	2025-07-04 12:17:06.535591	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631426510,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74251	2025-07-04 12:17:07.350725	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74256	2025-07-04 12:17:07.439226	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74263	2025-07-04 12:17:17.3096	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74273	2025-07-04 12:17:22.474074	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631442454,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74287	2025-07-04 12:17:43.868643	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74306	2025-07-04 12:17:45.882219	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
74310	2025-07-04 12:17:45.935449	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74318	2025-07-04 12:17:46.675532	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72642	2025-07-04 11:59:32.615849	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72654	2025-07-04 11:59:33.253528	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630373232,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72671	2025-07-04 11:59:34.569325	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
72674	2025-07-04 11:59:36.719171	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/suppliers:{}","method":"GET","url":"/api/suppliers"}}
72679	2025-07-04 11:59:38.743705	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":149}}
72684	2025-07-04 11:59:40.669895	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72689	2025-07-04 11:59:54.031788	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72694	2025-07-04 11:59:56.655451	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72700	2025-07-04 11:59:59.529355	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72704	2025-07-04 12:00:17.945122	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72710	2025-07-04 12:00:19.452493	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72724	2025-07-04 12:00:20.122305	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72738	2025-07-04 12:00:21.516007	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72744	2025-07-04 12:00:22.013186	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630421991,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72753	2025-07-04 12:00:22.052957	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":45}
72757	2025-07-04 12:00:24.403303	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72771	2025-07-04 12:00:32.128062	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":3}
72776	2025-07-04 12:00:32.196791	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72780	2025-07-04 12:00:34.148039	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72816	2025-07-04 12:00:38.403133	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72821	2025-07-04 12:00:38.439066	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":149},"duration":1}
72824	2025-07-04 12:00:45.428972	INFO	Начинаем транзакцию создания заказа с резервами	app	{"meta":{"service":"transaction"}}
72825	2025-07-04 12:00:45.587249	DEBUG	Создан резерв для заказа	app	{"meta":{"orderId":90,"productId":437,"service":"transaction"}}
72826	2025-07-04 12:00:45.668888	INFO	Транзакция создания заказа завершена	app	{"meta":{"service":"transaction"}}
72834	2025-07-04 12:00:46.532818	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630446510,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72845	2025-07-04 12:00:48.002367	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72847	2025-07-04 12:00:48.534047	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72885	2025-07-04 12:00:53.37316	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72920	2025-07-04 12:01:01.717552	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72940	2025-07-04 12:01:02.799241	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72944	2025-07-04 12:01:02.850353	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":52}
72954	2025-07-04 12:01:10.610509	INFO	Performance: getDocuments	database	{"duration":73}
72957	2025-07-04 12:01:11.085801	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72978	2025-07-04 12:01:12.640764	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630472619,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72997	2025-07-04 12:01:15.25417	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73011	2025-07-04 12:01:15.831863	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73019	2025-07-04 12:01:17.94334	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73033	2025-07-04 12:01:22.509362	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73039	2025-07-04 12:01:22.549038	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
74221	2025-07-04 12:17:04.680606	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631424657,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74242	2025-07-04 12:17:06.536415	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74249	2025-07-04 12:17:07.350369	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74266	2025-07-04 12:17:17.310019	DEBUG	Starting: getDocuments	database	\N
74270	2025-07-04 12:17:17.385591	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74275	2025-07-04 12:17:22.47466	DEBUG	Starting: getDocuments	database	\N
74285	2025-07-04 12:17:43.864744	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74294	2025-07-04 12:17:43.903915	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631463885,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74296	2025-07-04 12:17:44.512269	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74298	2025-07-04 12:17:44.594055	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":81}
74307	2025-07-04 12:17:45.914087	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74319	2025-07-04 12:17:46.675713	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74343	2025-07-04 12:17:48.317705	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74347	2025-07-04 12:17:48.357359	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
74352	2025-07-04 12:17:54.571893	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74360	2025-07-04 12:17:54.609486	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
77062	2025-07-04 12:44:11.630554	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72643	2025-07-04 11:59:32.616337	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72646	2025-07-04 11:59:32.657019	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72655	2025-07-04 11:59:33.25391	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72669	2025-07-04 11:59:34.531843	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72675	2025-07-04 11:59:36.71975	INFO	Performance: GET /suppliers	api	{"meta":{"statusCode":200,"responseSize":139},"duration":1}
72680	2025-07-04 11:59:38.744136	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630378722,"responseTime":1,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
72685	2025-07-04 11:59:40.670296	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630380648,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72690	2025-07-04 11:59:54.031978	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630394010,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72695	2025-07-04 11:59:56.655879	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72701	2025-07-04 11:59:59.529888	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630399507,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72706	2025-07-04 12:00:17.946053	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72709	2025-07-04 12:00:19.452771	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630419431,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72723	2025-07-04 12:00:20.12217	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72745	2025-07-04 12:00:22.013451	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72760	2025-07-04 12:00:24.408471	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72773	2025-07-04 12:00:32.128479	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72785	2025-07-04 12:00:34.149168	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72800	2025-07-04 12:00:35.157148	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630435134,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72802	2025-07-04 12:00:35.241241	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72813	2025-07-04 12:00:38.402635	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72841	2025-07-04 12:00:46.573887	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
72849	2025-07-04 12:00:48.537598	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72886	2025-07-04 12:00:53.373672	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630453352,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72908	2025-07-04 12:01:01.330205	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72912	2025-07-04 12:01:01.372247	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
72919	2025-07-04 12:01:01.717012	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72937	2025-07-04 12:01:02.79547	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72951	2025-07-04 12:01:10.541062	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72955	2025-07-04 12:01:10.61149	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72958	2025-07-04 12:01:11.087074	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72979	2025-07-04 12:01:12.640951	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72988	2025-07-04 12:01:12.863038	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":149},"duration":1}
72998	2025-07-04 12:01:15.254462	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73014	2025-07-04 12:01:15.833104	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630475810,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73015	2025-07-04 12:01:15.87339	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630475853,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
73021	2025-07-04 12:01:17.943646	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630477918,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73035	2025-07-04 12:01:22.509799	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74232	2025-07-04 12:17:04.7977	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74234	2025-07-04 12:17:05.627909	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74236	2025-07-04 12:17:06.529077	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76141	2025-07-04 12:32:25.284647	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76153	2025-07-04 12:32:26.587471	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76168	2025-07-04 12:32:27.190923	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76172	2025-07-04 12:32:27.260187	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76185	2025-07-04 12:32:27.902816	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
76188	2025-07-04 12:32:28.694404	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76213	2025-07-04 12:32:46.639373	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76220	2025-07-04 12:32:47.664887	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76229	2025-07-04 12:32:48.279798	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":2}
76236	2025-07-04 12:32:48.97022	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76242	2025-07-04 12:32:49.495754	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":1}
76247	2025-07-04 12:32:50.702411	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76264	2025-07-04 12:32:51.521415	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77066	2025-07-04 12:44:11.745856	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72649	2025-07-04 11:59:32.728047	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72650	2025-07-04 11:59:33.251979	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74295	2025-07-04 12:17:43.981043	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74297	2025-07-04 12:17:44.593421	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74299	2025-07-04 12:17:45.875888	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74308	2025-07-04 12:17:45.914276	DEBUG	Starting: getShipments	database	\N
74324	2025-07-04 12:17:46.710837	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
74330	2025-07-04 12:17:47.720859	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631467701,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74341	2025-07-04 12:17:48.317288	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74353	2025-07-04 12:17:54.572468	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74361	2025-07-04 12:17:54.609973	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631474591,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76142	2025-07-04 12:32:25.292721	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76152	2025-07-04 12:32:26.587265	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76177	2025-07-04 12:32:27.864268	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76192	2025-07-04 12:32:28.696443	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76206	2025-07-04 12:32:46.634659	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":2}
76222	2025-07-04 12:32:47.666047	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76225	2025-07-04 12:32:47.745885	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":81}
76228	2025-07-04 12:32:48.279938	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
76234	2025-07-04 12:32:48.967292	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
76251	2025-07-04 12:32:50.705216	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76256	2025-07-04 12:32:50.780708	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":75}
76259	2025-07-04 12:32:51.518671	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76269	2025-07-04 12:32:51.559703	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632371538,"responseTime":39,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76278	2025-07-04 12:32:52.355291	INFO	Performance: getDocuments	database	{"duration":73}
76282	2025-07-04 12:33:01.210544	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76299	2025-07-04 12:33:10.74089	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76314	2025-07-04 12:33:13.67054	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76319	2025-07-04 12:33:13.710216	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":39}
76321	2025-07-04 12:33:14.179083	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76342	2025-07-04 12:33:14.732422	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"36ms","rowCount":1}}
76349	2025-07-04 12:33:31.368971	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
76360	2025-07-04 12:33:31.40856	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
76370	2025-07-04 12:33:31.444169	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77069	2025-07-04 12:44:12.188435	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77072	2025-07-04 12:44:12.621163	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77081	2025-07-04 12:44:12.662399	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633052642,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77087	2025-07-04 12:44:36.911948	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77492	2025-07-04 12:48:14.713203	INFO	Processing writeoff for shipment going to shipped status	app	{"meta":{"shipmentId":57,"oldStatus":"draft","newStatus":"shipped"}}
77501	2025-07-04 12:48:14.759637	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77505	2025-07-04 12:48:14.802927	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633294782,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77509	2025-07-04 12:48:15.021716	INFO	Shipment updated via service	app	{"meta":{"shipmentId":57,"updatedFields":["status"],"status":"draft"}}
77518	2025-07-04 12:48:15.065454	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77522	2025-07-04 12:48:15.109582	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633295089,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77526	2025-07-04 12:48:23.485364	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77528	2025-07-04 12:48:24.313248	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77536	2025-07-04 12:48:31.457129	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77543	2025-07-04 12:48:32.027592	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
77544	2025-07-04 12:48:32.067662	INFO	Транзакция создания заказа завершена	app	{"meta":{"service":"transaction"}}
77547	2025-07-04 12:48:32.521176	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77603	2025-07-04 12:48:57.109677	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77604	2025-07-04 12:48:59.409521	INFO	GET /inventory	api	{"meta":{"method":"GET","url":"/inventory","bodySize":2}}
77611	2025-07-04 12:48:59.449634	DEBUG	Response cached	app	{"meta":{"key":"inventory:/:all","size":64}}
72661	2025-07-04 11:59:33.374955	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72664	2025-07-04 11:59:33.936929	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72667	2025-07-04 11:59:34.531376	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72676	2025-07-04 11:59:36.719955	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/suppliers:{}","dataSize":139}}
72681	2025-07-04 11:59:38.744366	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
72686	2025-07-04 11:59:40.670552	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72691	2025-07-04 11:59:54.032139	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72696	2025-07-04 11:59:56.65606	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630396633,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72698	2025-07-04 11:59:59.528894	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72705	2025-07-04 12:00:17.945755	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630417925,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72711	2025-07-04 12:00:19.453245	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72716	2025-07-04 12:00:19.628493	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":172}
72721	2025-07-04 12:00:20.121785	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72762	2025-07-04 12:00:24.409877	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72769	2025-07-04 12:00:32.12723	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72787	2025-07-04 12:00:34.149487	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72792	2025-07-04 12:00:34.193306	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630434171,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72797	2025-07-04 12:00:35.155657	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72803	2025-07-04 12:00:35.24244	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":88}
72805	2025-07-04 12:00:36.194411	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72806	2025-07-04 12:00:36.23621	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
72814	2025-07-04 12:00:38.40259	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72836	2025-07-04 12:00:46.534516	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72848	2025-07-04 12:00:48.537741	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72887	2025-07-04 12:00:53.37385	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72909	2025-07-04 12:01:01.33106	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72917	2025-07-04 12:01:01.402032	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":77}
72918	2025-07-04 12:01:01.716697	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72938	2025-07-04 12:01:02.795874	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630462774,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72947	2025-07-04 12:01:10.539634	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72959	2025-07-04 12:01:11.08845	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72980	2025-07-04 12:01:12.6411	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72989	2025-07-04 12:01:12.863281	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":149}}
72995	2025-07-04 12:01:15.253411	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
73013	2025-07-04 12:01:15.832938	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
73017	2025-07-04 12:01:15.874351	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":46}
73022	2025-07-04 12:01:17.943782	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73034	2025-07-04 12:01:22.509592	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74326	2025-07-04 12:17:46.715735	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631466695,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74329	2025-07-04 12:17:47.300514	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74331	2025-07-04 12:17:47.721208	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74344	2025-07-04 12:17:48.319179	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74350	2025-07-04 12:17:54.571306	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76143	2025-07-04 12:32:25.293461	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76146	2025-07-04 12:32:25.368251	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632345348,"responseTime":203,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76148	2025-07-04 12:32:25.972571	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
76149	2025-07-04 12:32:26.016772	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
76154	2025-07-04 12:32:26.587661	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76160	2025-07-04 12:32:26.627361	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632346609,"responseTime":45,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76165	2025-07-04 12:32:27.188274	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632347165,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76178	2025-07-04 12:32:27.86446	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76190	2025-07-04 12:32:28.696139	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76197	2025-07-04 12:32:28.774969	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72713	2025-07-04 12:00:19.579163	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72717	2025-07-04 12:00:19.628819	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72725	2025-07-04 12:00:20.122431	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630420096,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72729	2025-07-04 12:00:20.163322	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630420142,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72733	2025-07-04 12:00:20.860227	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":42}
72735	2025-07-04 12:00:21.476473	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72746	2025-07-04 12:00:22.013598	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72754	2025-07-04 12:00:22.053578	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
72758	2025-07-04 12:00:24.403913	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72774	2025-07-04 12:00:32.128696	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630432106,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72778	2025-07-04 12:00:32.197461	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":77}
72786	2025-07-04 12:00:34.149357	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72798	2025-07-04 12:00:35.155755	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72801	2025-07-04 12:00:35.241275	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
72815	2025-07-04 12:00:38.40296	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630438377,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72837	2025-07-04 12:00:46.534668	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72854	2025-07-04 12:00:48.538821	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72858	2025-07-04 12:00:48.578865	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
72860	2025-07-04 12:00:49.236212	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72862	2025-07-04 12:00:50.968637	INFO	GET /orders/90	api	{"meta":{"method":"GET","url":"/orders/90","bodySize":2}}
72863	2025-07-04 12:00:51.048999	DEBUG	Retrieved order by ID	api	{"meta":{"id":90,"found":true,"entity":"Order"}}
72867	2025-07-04 12:00:51.222327	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72871	2025-07-04 12:00:51.390743	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72880	2025-07-04 12:00:51.535945	INFO	Performance: GET /contractors	api	{"meta":{"statusCode":200,"responseSize":149},"duration":1}
72882	2025-07-04 12:00:52.545968	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72888	2025-07-04 12:00:53.373651	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72911	2025-07-04 12:01:01.371262	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
72921	2025-07-04 12:01:01.717721	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72941	2025-07-04 12:01:02.80126	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72948	2025-07-04 12:01:10.539838	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72960	2025-07-04 12:01:11.089096	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72977	2025-07-04 12:01:12.639797	INFO	GET /orders/90	api	{"meta":{"method":"GET","url":"/orders/90","bodySize":2}}
72999	2025-07-04 12:01:15.254376	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630475232,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
73010	2025-07-04 12:01:15.830917	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73024	2025-07-04 12:01:17.944464	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73040	2025-07-04 12:01:22.549491	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
74362	2025-07-04 12:18:59.891578	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74371	2025-07-04 12:18:59.936942	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":179}
76144	2025-07-04 12:32:25.29456	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76145	2025-07-04 12:32:25.367901	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":202}
76161	2025-07-04 12:32:26.628084	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
76166	2025-07-04 12:32:27.189151	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76182	2025-07-04 12:32:27.865293	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76194	2025-07-04 12:32:28.697037	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632348673,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76198	2025-07-04 12:32:28.775206	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":85}
76201	2025-07-04 12:32:46.348604	DEBUG	Database operation started	database	{"meta":{"operation":"getDocument","module":"storage","queryType":"select","documentId":305}}
76203	2025-07-04 12:32:46.429117	INFO	Database operation completed	database	{"meta":{"operation":"getDocument","module":"storage","documentId":305,"duration":"undefinedms","itemsCount":1}}
76208	2025-07-04 12:32:46.635591	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632366612,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
76262	2025-07-04 12:32:51.519852	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76273	2025-07-04 12:32:52.290869	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76285	2025-07-04 12:33:01.21199	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76302	2025-07-04 12:33:10.742235	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76312	2025-07-04 12:33:13.668919	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76326	2025-07-04 12:33:14.181025	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
72714	2025-07-04 12:00:19.581208	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72718	2025-07-04 12:00:19.629053	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72720	2025-07-04 12:00:20.120593	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72742	2025-07-04 12:00:21.52016	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630421493,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72752	2025-07-04 12:00:22.051244	INFO	Performance: getDocuments	database	{"duration":43}
72755	2025-07-04 12:00:24.402472	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
72772	2025-07-04 12:00:32.128262	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72782	2025-07-04 12:00:34.148611	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72793	2025-07-04 12:00:35.154381	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72810	2025-07-04 12:00:38.401193	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630438381,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72819	2025-07-04 12:00:38.438011	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630438386,"responseTime":1,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
72832	2025-07-04 12:00:46.532152	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72852	2025-07-04 12:00:48.538571	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72866	2025-07-04 12:00:51.219687	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72872	2025-07-04 12:00:51.391735	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
72876	2025-07-04 12:00:51.534676	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":149}}
72890	2025-07-04 12:00:53.378317	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72900	2025-07-04 12:01:01.155442	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72907	2025-07-04 12:01:01.329305	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72916	2025-07-04 12:01:01.400833	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
72927	2025-07-04 12:01:01.762995	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"50ms","rowCount":1}}
72942	2025-07-04 12:01:02.836406	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"41ms","rowCount":1}}
72946	2025-07-04 12:01:10.538401	DEBUG	Starting: getDocuments	database	\N
72961	2025-07-04 12:01:11.091521	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72966	2025-07-04 12:01:11.134445	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630471115,"responseTime":47,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72972	2025-07-04 12:01:12.63589	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630472614,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72981	2025-07-04 12:01:12.674562	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72984	2025-07-04 12:01:12.772781	DEBUG	Retrieved order by ID	api	{"meta":{"id":90,"found":true,"entity":"Order"}}
72986	2025-07-04 12:01:12.861551	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
72991	2025-07-04 12:01:14.506814	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72992	2025-07-04 12:01:14.588401	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
72996	2025-07-04 12:01:15.253564	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
73009	2025-07-04 12:01:15.830612	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
73020	2025-07-04 12:01:17.943497	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73028	2025-07-04 12:01:17.984379	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":42}
73030	2025-07-04 12:01:22.507804	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74363	2025-07-04 12:18:59.896435	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74373	2025-07-04 12:18:59.938148	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631539919,"responseTime":179,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76147	2025-07-04 12:32:25.369657	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"199ms","rowCount":1}}
76150	2025-07-04 12:32:26.019251	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
76156	2025-07-04 12:32:26.589659	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76169	2025-07-04 12:32:27.191329	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76173	2025-07-04 12:32:27.261839	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":72}
76179	2025-07-04 12:32:27.864661	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76189	2025-07-04 12:32:28.694934	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76215	2025-07-04 12:32:46.644056	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76217	2025-07-04 12:32:47.66244	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76238	2025-07-04 12:32:48.970888	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76243	2025-07-04 12:32:49.496083	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632369475,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
76248	2025-07-04 12:32:50.702654	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632370682,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76265	2025-07-04 12:32:51.521574	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76276	2025-07-04 12:32:52.291553	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76280	2025-07-04 12:32:52.357555	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76288	2025-07-04 12:33:01.213994	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72715	2025-07-04 12:00:19.589903	DEBUG	Starting: getDocuments	database	\N
72726	2025-07-04 12:00:20.122564	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72739	2025-07-04 12:00:21.516305	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72749	2025-07-04 12:00:22.014194	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72764	2025-07-04 12:00:24.411262	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72766	2025-07-04 12:00:31.926442	INFO	Performance: POST /documents/create	api	{"meta":{"statusCode":201,"responseSize":171},"duration":410}
72777	2025-07-04 12:00:32.197068	INFO	Performance: getDocuments	database	{"duration":74}
72784	2025-07-04 12:00:34.149003	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630434125,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72796	2025-07-04 12:00:35.155502	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72812	2025-07-04 12:00:38.402371	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
72822	2025-07-04 12:00:38.439742	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/contractors:{}","dataSize":149}}
72828	2025-07-04 12:00:45.708489	INFO	Performance: POST /orders/create	api	{"meta":{"statusCode":201,"responseSize":236},"duration":319}
72830	2025-07-04 12:00:45.993473	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72838	2025-07-04 12:00:46.534877	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72856	2025-07-04 12:00:48.577713	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
72865	2025-07-04 12:00:51.049469	INFO	Performance: GET /orders/90	api	{"meta":{"statusCode":200,"responseSize":298},"duration":79}
72869	2025-07-04 12:00:51.223435	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72874	2025-07-04 12:00:51.393453	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630451370,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72879	2025-07-04 12:00:51.535365	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
72893	2025-07-04 12:00:53.415287	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"46ms","rowCount":1}}
72896	2025-07-04 12:00:54.112018	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72897	2025-07-04 12:00:54.190809	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":79}
72903	2025-07-04 12:01:01.159005	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72915	2025-07-04 12:01:01.400687	INFO	Performance: getDocuments	database	{"duration":75}
72923	2025-07-04 12:01:01.723461	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72935	2025-07-04 12:01:02.794954	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72950	2025-07-04 12:01:10.540128	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72963	2025-07-04 12:01:11.092727	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72974	2025-07-04 12:01:12.636826	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
72982	2025-07-04 12:01:12.674954	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72985	2025-07-04 12:01:12.773094	INFO	Performance: GET /orders/90	api	{"meta":{"statusCode":200,"responseSize":298},"duration":132}
72990	2025-07-04 12:01:12.866121	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
72993	2025-07-04 12:01:14.58879	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
73005	2025-07-04 12:01:15.338186	INFO	Performance: getDocuments	database	{"duration":82}
73008	2025-07-04 12:01:15.830256	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
73023	2025-07-04 12:01:17.944255	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73037	2025-07-04 12:01:22.510323	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74364	2025-07-04 12:18:59.900772	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76151	2025-07-04 12:32:26.587038	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76164	2025-07-04 12:32:27.187497	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76175	2025-07-04 12:32:27.862917	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76184	2025-07-04 12:32:27.901239	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632347883,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76187	2025-07-04 12:32:28.694062	DEBUG	Starting: getDocuments	database	\N
76211	2025-07-04 12:32:46.638458	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632366618,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76219	2025-07-04 12:32:47.664026	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76239	2025-07-04 12:32:49.007627	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
76241	2025-07-04 12:32:49.495097	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
76246	2025-07-04 12:32:50.702071	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76267	2025-07-04 12:32:51.555839	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"35ms","rowCount":1}}
76270	2025-07-04 12:32:52.280806	DEBUG	Starting: getDocuments	database	\N
76283	2025-07-04 12:33:01.211318	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76303	2025-07-04 12:33:10.77427	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"35ms","rowCount":1}}
76309	2025-07-04 12:33:13.666911	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632393647,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76335	2025-07-04 12:33:14.695441	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76350	2025-07-04 12:33:31.369318	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
76359	2025-07-04 12:33:31.406983	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77078	2025-07-04 12:44:12.623385	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72719	2025-07-04 12:00:19.63018	INFO	Performance: getDocuments	database	{"duration":171}
72722	2025-07-04 12:00:20.122011	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72741	2025-07-04 12:00:21.517735	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":41}
72748	2025-07-04 12:00:22.013935	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72763	2025-07-04 12:00:24.411351	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630424387,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72765	2025-07-04 12:00:31.515785	INFO	POST /documents/create	api	{"meta":{"method":"POST","url":"/documents/create","bodySize":137}}
72767	2025-07-04 12:00:31.927092	INFO	Inventory cache invalidated after receipt document creation	api	{"meta":{"documentId":300}}
72770	2025-07-04 12:00:32.127818	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72789	2025-07-04 12:00:34.192363	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
72799	2025-07-04 12:00:35.156143	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72817	2025-07-04 12:00:38.403875	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
72839	2025-07-04 12:00:46.535047	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
72855	2025-07-04 12:00:48.53998	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72857	2025-07-04 12:00:48.578958	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630448558,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72859	2025-07-04 12:00:49.160463	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72861	2025-07-04 12:00:49.236621	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
72864	2025-07-04 12:00:51.049314	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":90,"itemsCount":1}}
72870	2025-07-04 12:00:51.223756	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630451199,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72875	2025-07-04 12:00:51.393598	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
72878	2025-07-04 12:00:51.535174	INFO	GET /contractors	api	{"meta":{"method":"GET","url":"/contractors","bodySize":2}}
72892	2025-07-04 12:00:53.379054	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72895	2025-07-04 12:00:53.4177	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630453398,"responseTime":49,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
72898	2025-07-04 12:00:54.191159	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
72901	2025-07-04 12:01:01.156158	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72905	2025-07-04 12:01:01.326027	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
72924	2025-07-04 12:01:01.724567	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630461694,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72936	2025-07-04 12:01:02.795525	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72952	2025-07-04 12:01:10.541298	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72956	2025-07-04 12:01:10.611694	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
72965	2025-07-04 12:01:11.095182	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
72967	2025-07-04 12:01:11.135362	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":47}
72969	2025-07-04 12:01:11.60409	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72970	2025-07-04 12:01:11.686163	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":81}
72975	2025-07-04 12:01:12.63748	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
73012	2025-07-04 12:01:15.832663	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
73025	2025-07-04 12:01:17.944619	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
73038	2025-07-04 12:01:22.510485	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74365	2025-07-04 12:18:59.901749	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76199	2025-07-04 12:32:46.347156	INFO	GET /documents/305	api	{"meta":{"method":"GET","url":"/documents/305","bodySize":2}}
76202	2025-07-04 12:32:46.428118	INFO	Performance: GET /documents/305	api	{"meta":{"statusCode":200,"responseSize":234},"duration":84}
76207	2025-07-04 12:32:46.635014	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
76221	2025-07-04 12:32:47.666116	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76224	2025-07-04 12:32:47.746025	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76230	2025-07-04 12:32:48.280269	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632368259,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
76235	2025-07-04 12:32:48.968443	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76254	2025-07-04 12:32:50.779713	INFO	Performance: getDocuments	database	{"duration":73}
76260	2025-07-04 12:32:51.518875	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632371497,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76268	2025-07-04 12:32:51.556489	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":38}
76271	2025-07-04 12:32:52.281678	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
76286	2025-07-04 12:33:01.212118	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76296	2025-07-04 12:33:10.73938	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
76318	2025-07-04 12:33:13.708695	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
76323	2025-07-04 12:33:14.179575	DEBUG	Starting: getDocuments	database	\N
76337	2025-07-04 12:33:14.696555	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72731	2025-07-04 12:00:20.248902	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72734	2025-07-04 12:00:20.862067	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72736	2025-07-04 12:00:21.515011	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
72743	2025-07-04 12:00:22.012924	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
72751	2025-07-04 12:00:22.050907	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
72756	2025-07-04 12:00:24.402794	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630424381,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
72781	2025-07-04 12:00:34.148371	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72794	2025-07-04 12:00:35.154677	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
72809	2025-07-04 12:00:38.40123	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72818	2025-07-04 12:00:38.436986	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/contractors:{}","method":"GET","url":"/api/contractors"}}
72833	2025-07-04 12:00:46.532553	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
72851	2025-07-04 12:00:48.538338	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
72891	2025-07-04 12:00:53.378679	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72894	2025-07-04 12:00:53.415781	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":49}
72899	2025-07-04 12:01:01.155132	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630461131,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
72904	2025-07-04 12:01:01.324035	DEBUG	Starting: getDocuments	database	\N
72926	2025-07-04 12:01:01.725603	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
72928	2025-07-04 12:01:01.767485	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":56}
72930	2025-07-04 12:01:02.197779	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
72931	2025-07-04 12:01:02.281495	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":85}
72933	2025-07-04 12:01:02.793929	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
72962	2025-07-04 12:01:11.091706	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
72983	2025-07-04 12:01:12.771884	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":90,"itemsCount":1}}
72987	2025-07-04 12:01:12.861843	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630472841,"responseTime":1,"endpoint":"/api/contractors","cacheHit":true,"dbQueries":0}}
72994	2025-07-04 12:01:15.2531	DEBUG	Starting: getDocuments	database	\N
73004	2025-07-04 12:01:15.338011	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":83}
73006	2025-07-04 12:01:15.829058	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
73018	2025-07-04 12:01:17.942988	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
73032	2025-07-04 12:01:22.509154	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
73041	2025-07-04 12:01:22.551876	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751630482530,"responseTime":43,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74366	2025-07-04 12:18:59.905461	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76275	2025-07-04 12:32:52.291132	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76279	2025-07-04 12:32:52.357305	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":74}
76289	2025-07-04 12:33:01.214649	DEBUG	Starting: getDocuments	database	\N
76291	2025-07-04 12:33:01.295349	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76298	2025-07-04 12:33:10.740243	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632390717,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76316	2025-07-04 12:33:13.672987	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76327	2025-07-04 12:33:14.184708	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76330	2025-07-04 12:33:14.262498	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
76333	2025-07-04 12:33:14.694903	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76357	2025-07-04 12:33:31.401773	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76365	2025-07-04 12:33:31.437471	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76374	2025-07-04 12:33:31.474634	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77082	2025-07-04 12:44:36.910858	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77510	2025-07-04 12:48:15.022318	INFO	Processing restore for shipment going from shipped to draft	app	{"meta":{"shipmentId":57,"oldStatus":"shipped","newStatus":"draft"}}
77519	2025-07-04 12:48:15.066043	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77520	2025-07-04 12:48:15.107626	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":44}
77525	2025-07-04 12:48:23.48391	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
77527	2025-07-04 12:48:24.311766	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":419},"duration":1}
77529	2025-07-04 12:48:31.455515	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77553	2025-07-04 12:48:32.524933	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77556	2025-07-04 12:48:38.495689	INFO	PUT /shipments/57	api	{"meta":{"method":"PUT","url":"/shipments/57","bodySize":14}}
77557	2025-07-04 12:48:38.569667	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":57,"itemsCount":1}}
77558	2025-07-04 12:48:38.677615	INFO	Shipment updated	database	{"meta":{"shipmentId":57,"updatedFields":["orderId"],"status":"draft"}}
77559	2025-07-04 12:48:38.715042	INFO	Shipment updated	app	{"meta":{"shipmentId":57,"updatedFields":["orderId"]}}
77565	2025-07-04 12:48:45.739807	INFO	Processing writeoff for shipment going to shipped status	app	{"meta":{"shipmentId":57,"oldStatus":"draft","newStatus":"shipped"}}
74367	2025-07-04 12:18:59.905969	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
76290	2025-07-04 12:33:01.294763	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76301	2025-07-04 12:33:10.742071	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76311	2025-07-04 12:33:13.668733	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76320	2025-07-04 12:33:13.711857	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632393690,"responseTime":39,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76329	2025-07-04 12:33:14.26211	INFO	Performance: getDocuments	database	{"duration":85}
76336	2025-07-04 12:33:14.695625	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632394673,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76345	2025-07-04 12:33:31.329927	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76351	2025-07-04 12:33:31.370119	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":39}
76362	2025-07-04 12:33:31.41031	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":20}}
76372	2025-07-04 12:33:31.448554	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632411401,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77094	2025-07-04 12:44:47.447009	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77099	2025-07-04 12:44:47.485511	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
77109	2025-07-04 12:44:47.521339	DEBUG	Starting: getShipments	database	\N
77117	2025-07-04 12:44:47.557167	INFO	Performance: getContractors	database	{"duration":513}
77127	2025-07-04 12:44:47.613137	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77135	2025-07-04 12:44:47.839152	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"612ms","forced":false}}
77138	2025-07-04 12:44:51.076439	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77149	2025-07-04 12:44:55.65938	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
77160	2025-07-04 12:45:04.268927	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":47}
77165	2025-07-04 12:45:06.613777	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77172	2025-07-04 12:45:18.855369	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":2}
77177	2025-07-04 12:45:19.746206	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77190	2025-07-04 12:45:20.64193	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77204	2025-07-04 12:45:33.731684	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77210	2025-07-04 12:45:33.769357	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633133751,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77211	2025-07-04 12:45:34.782725	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77229	2025-07-04 12:45:35.355826	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633135334,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77233	2025-07-04 12:45:35.393698	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":44}
77236	2025-07-04 12:45:36.308217	INFO	Retrieved all orders	api	{"meta":{"count":0,"entity":"Order"}}
77239	2025-07-04 12:45:36.735388	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77511	2025-07-04 12:48:15.057276	INFO	Order not found	database	{"meta":{"operation":"getOrder","module":"storage","orderId":1}}
77531	2025-07-04 12:48:31.456101	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77551	2025-07-04 12:48:32.5248	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633312503,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77590	2025-07-04 12:48:56.487021	INFO	Performance: getDocuments	database	{"duration":72}
77596	2025-07-04 12:48:57.107284	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77615	2025-07-04 12:49:12.682749	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77813	2025-07-04 13:50:27.965065	INFO	Performance: getWarehouses	database	{"duration":48}
77817	2025-07-04 13:50:28.017264	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77820	2025-07-04 13:50:31.193275	INFO	Начинаем транзакцию удаления документа	app	{"meta":{"documentId":305,"service":"transaction"}}
77821	2025-07-04 13:50:31.48668	INFO	Транзакция удаления документа завершена	app	{"meta":{"service":"transaction"}}
77826	2025-07-04 13:50:31.762348	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77831	2025-07-04 13:50:32.507891	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77840	2025-07-04 13:50:33.278656	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77845	2025-07-04 13:50:34.612672	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77847	2025-07-04 13:50:35.244051	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77853	2025-07-04 13:50:35.269034	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77855	2025-07-04 13:50:36.004192	INFO	Performance: getProducts	database	{"duration":25}
77859	2025-07-04 13:50:36.318257	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77892	2025-07-04 13:55:00.626781	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1262453},"duration":488}
77900	2025-07-04 13:55:10.87864	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1264022},"duration":278}
77902	2025-07-04 13:55:13.257169	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
77907	2025-07-04 13:55:13.300167	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637313281,"responseTime":46,"endpoint":"/api/products","cacheHit":false,"dbQueries":1}}
77911	2025-07-04 13:55:14.374271	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637314353,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74368	2025-07-04 12:18:59.906607	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631539731,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76341	2025-07-04 12:33:14.69742	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76344	2025-07-04 12:33:14.737517	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":39}
76346	2025-07-04 12:33:31.330864	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76353	2025-07-04 12:33:31.398776	WARN	API route not found	api	{"meta":{"path":"/api/shipments/create","method":"POST","userAgent":"node","ip":"127.0.0.1"}}
76364	2025-07-04 12:33:31.436882	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76373	2025-07-04 12:33:31.474218	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77095	2025-07-04 12:44:47.472533	DEBUG	Starting: getDocuments	database	\N
77105	2025-07-04 12:44:47.507993	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
77123	2025-07-04 12:44:47.579561	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"519ms","forced":false}}
77129	2025-07-04 12:44:47.614689	INFO	Performance: getProducts	database	{"duration":525}
77533	2025-07-04 12:48:31.456548	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633311431,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77555	2025-07-04 12:48:32.525826	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77561	2025-07-04 12:48:38.72313	INFO	Shipment updated via service	app	{"meta":{"shipmentId":57,"updatedFields":["orderId"],"status":"draft"}}
77567	2025-07-04 12:48:45.811682	INFO	Database operation completed	database	{"meta":{"operation":"getOrder","module":"storage","orderId":93,"itemsCount":1}}
77572	2025-07-04 12:48:46.02637	INFO	Inventory cache invalidated after shipment status change	app	{"meta":{"shipmentId":57,"oldStatus":"draft","newStatus":"shipped"}}
77580	2025-07-04 12:48:52.332743	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"39ms","rowCount":1}}
77583	2025-07-04 12:48:56.413704	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633336389,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77601	2025-07-04 12:48:57.108997	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77606	2025-07-04 12:48:59.410764	DEBUG	Starting getInventorySummary query	app	{"meta":{"service":"materialized"}}
77609	2025-07-04 12:48:59.448891	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633339429,"responseTime":40,"endpoint":"/api/inventory","cacheHit":false,"dbQueries":1}}
77617	2025-07-04 12:49:12.683219	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77815	2025-07-04 13:50:28.0157	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77827	2025-07-04 13:50:31.762159	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77833	2025-07-04 13:50:32.516028	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77839	2025-07-04 13:50:33.278299	INFO	Performance: getDocuments	database	{"duration":23}
77843	2025-07-04 13:50:34.591462	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77850	2025-07-04 13:50:35.267891	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77856	2025-07-04 13:50:36.005872	INFO	Retrieved all products	api	{"meta":{"count":11,"entity":"Product"}}
77860	2025-07-04 13:50:36.319011	INFO	Performance: getDocuments	database	{"duration":25}
77867	2025-07-04 13:50:37.044326	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77870	2025-07-04 13:50:37.927594	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
77873	2025-07-04 13:50:38.767174	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77878	2025-07-04 13:50:39.831292	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77901	2025-07-04 13:55:13.256924	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
77906	2025-07-04 13:55:13.299941	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":45}
77910	2025-07-04 13:55:14.373907	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77928	2025-07-04 13:55:16.11083	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77938	2025-07-04 13:55:18.569368	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77947	2025-07-04 13:55:18.605092	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77948	2025-07-04 13:55:18.665286	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":328},"duration":95}
77957	2025-07-04 13:55:20.864863	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77970	2025-07-04 13:55:22.203034	DEBUG	Starting: getDocuments	database	\N
77991	2025-07-04 14:00:36.16034	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":752}
78007	2025-07-04 14:20:23.462658	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
78020	2025-07-04 14:20:23.507908	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
78031	2025-07-04 14:20:23.545727	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78040	2025-07-04 14:20:23.583171	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
78045	2025-07-04 14:20:23.645889	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":868,"duration":"417ms","forced":false}}
78049	2025-07-04 14:34:36.309142	INFO	Performance: getContractors	database	{"duration":613}
78052	2025-07-04 14:34:36.34759	INFO	Performance: getInventory	database	{"meta":{},"duration":655}
78068	2025-07-04 14:34:36.900642	INFO	Разогрев кеша завершен	app	{"meta":{"successful":6,"failed":0,"total":6,"duration":"1214ms","forced":false}}
78071	2025-07-04 14:36:52.561379	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74369	2025-07-04 12:18:59.907296	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
76358	2025-07-04 12:33:31.401943	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632411381,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76367	2025-07-04 12:33:31.438265	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":18}}
77096	2025-07-04 12:44:47.47455	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77106	2025-07-04 12:44:47.510521	DEBUG	Starting: getInventory	database	{"meta":{}}
77114	2025-07-04 12:44:47.545526	INFO	Performance: getWarehouses	database	{"duration":511}
77124	2025-07-04 12:44:47.590555	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"521ms","forced":false}}
77130	2025-07-04 12:44:47.837933	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"606ms","forced":false}}
77141	2025-07-04 12:44:51.08081	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77152	2025-07-04 12:44:55.694865	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
77154	2025-07-04 12:45:04.213901	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
77176	2025-07-04 12:45:19.74562	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77187	2025-07-04 12:45:20.640574	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77200	2025-07-04 12:45:33.729961	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77216	2025-07-04 12:45:34.784708	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77224	2025-07-04 12:45:35.355	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77234	2025-07-04 12:45:35.39388	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633135375,"responseTime":44,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77235	2025-07-04 12:45:36.273985	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77238	2025-07-04 12:45:36.73504	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633136715,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77568	2025-07-04 12:48:45.847119	DEBUG	Shipment writeoff started	database	{"meta":{"operation":"processShipmentWriteoff","module":"storage","shipmentId":57,"itemsCount":1}}
77569	2025-07-04 12:48:45.986312	DEBUG	Shipment item written off	database	{"meta":{"operation":"processShipmentWriteoff","module":"storage","shipmentId":57,"productId":443,"quantityWrittenOff":1}}
77574	2025-07-04 12:48:52.292965	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77586	2025-07-04 12:48:56.418219	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77592	2025-07-04 12:48:56.48996	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":74}
77595	2025-07-04 12:48:57.107344	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77614	2025-07-04 12:49:12.682583	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77824	2025-07-04 13:50:31.518764	INFO	Performance: POST /documents/delete-multiple	api	{"meta":{"statusCode":200,"responseSize":60},"duration":349}
77829	2025-07-04 13:50:31.76291	INFO	Performance: getDocuments	database	{"duration":26}
77830	2025-07-04 13:50:32.507449	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77838	2025-07-04 13:50:33.260055	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77851	2025-07-04 13:50:35.26828	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":24}
77854	2025-07-04 13:50:35.979765	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
77863	2025-07-04 13:50:36.319686	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77866	2025-07-04 13:50:37.026239	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77875	2025-07-04 13:50:38.788186	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77877	2025-07-04 13:50:39.811503	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77882	2025-07-04 13:50:39.864424	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77908	2025-07-04 13:55:13.300314	INFO	Retrieved all products	api	{"meta":{"count":11,"entity":"Product"}}
77913	2025-07-04 13:55:14.375614	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77919	2025-07-04 13:55:14.437489	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":49}
77926	2025-07-04 13:55:16.108928	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637316081,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77931	2025-07-04 13:55:16.153299	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
77940	2025-07-04 13:55:18.569901	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
77962	2025-07-04 13:55:20.866286	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77968	2025-07-04 13:55:22.202532	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77982	2025-07-04 13:55:23.285231	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":596},"duration":0}
77992	2025-07-04 14:00:36.450608	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1282913},"duration":1009}
78005	2025-07-04 14:20:23.458128	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
78022	2025-07-04 14:20:23.514368	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"228ms","forced":false}}
78032	2025-07-04 14:20:23.552323	INFO	Performance: getInventory	database	{"meta":{},"duration":234}
78041	2025-07-04 14:20:23.590157	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":2,"duration":"244ms","forced":false}}
74370	2025-07-04 12:18:59.910182	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76369	2025-07-04 12:33:31.442661	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":0,"responseSize":230}}
77097	2025-07-04 12:44:47.482425	DEBUG	Starting: getWarehouses	database	\N
77107	2025-07-04 12:44:47.519137	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":1685}}
77115	2025-07-04 12:44:47.554032	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
77125	2025-07-04 12:44:47.612392	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77131	2025-07-04 12:44:47.838399	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":3}}
77142	2025-07-04 12:44:51.082338	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77146	2025-07-04 12:44:55.654322	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77158	2025-07-04 12:45:04.221183	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77164	2025-07-04 12:45:06.613539	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77175	2025-07-04 12:45:19.745862	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77195	2025-07-04 12:45:20.677437	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
77201	2025-07-04 12:45:33.730908	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77209	2025-07-04 12:45:33.769141	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":44}
77212	2025-07-04 12:45:34.783067	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77227	2025-07-04 12:45:35.355504	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77243	2025-07-04 12:45:36.738859	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77618	2025-07-04 12:49:12.683397	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77834	2025-07-04 13:50:32.540534	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"22ms","rowCount":1}}
77837	2025-07-04 13:50:33.258137	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77852	2025-07-04 13:50:35.268826	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77857	2025-07-04 13:50:36.006054	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":28}
77858	2025-07-04 13:50:36.293304	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77862	2025-07-04 13:50:36.319392	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77879	2025-07-04 13:50:39.863876	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":27}
77883	2025-07-04 13:50:40.545266	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":2084},"duration":0}
77914	2025-07-04 13:55:14.376437	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77920	2025-07-04 13:55:14.438213	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77929	2025-07-04 13:55:16.111013	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77933	2025-07-04 13:55:16.154772	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":46}
77935	2025-07-04 13:55:17.165697	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77936	2025-07-04 13:55:17.260117	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":328},"duration":95}
77945	2025-07-04 13:55:18.579433	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
77953	2025-07-04 13:55:18.679338	INFO	Retrieved all shipments	app	{"meta":{"count":4,"entity":"Shipment"}}
77956	2025-07-04 13:55:19.856698	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
77965	2025-07-04 13:55:20.86872	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77974	2025-07-04 13:55:22.20372	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77985	2025-07-04 13:55:23.340526	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":48}
77993	2025-07-04 14:00:36.490413	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
78009	2025-07-04 14:20:23.466719	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
78017	2025-07-04 14:20:23.505987	DEBUG	Starting: getShipments	database	\N
78027	2025-07-04 14:20:23.541695	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"234ms","forced":false}}
78037	2025-07-04 14:20:23.575795	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
78050	2025-07-04 14:34:36.324455	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
78054	2025-07-04 14:34:36.34861	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
78063	2025-07-04 14:34:36.890518	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"1202ms","forced":false}}
78073	2025-07-04 14:36:52.571639	DEBUG	Starting: getWarehouses	database	\N
78082	2025-07-04 14:36:52.609823	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":131}}
78090	2025-07-04 14:36:52.646258	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
78101	2025-07-04 14:36:52.682925	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
74372	2025-07-04 12:18:59.937226	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"176ms","rowCount":1}}
76375	2025-07-04 12:34:16.163575	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76392	2025-07-04 12:34:26.740688	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77098	2025-07-04 12:44:47.482281	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
77108	2025-07-04 12:44:47.519411	DEBUG	Starting: getProducts	database	\N
77116	2025-07-04 12:44:47.55536	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"513ms","forced":false}}
77126	2025-07-04 12:44:47.612674	INFO	Performance: getInventory	database	{"meta":{},"duration":517}
77134	2025-07-04 12:44:47.83892	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":624,"duration":"610ms","forced":false}}
77145	2025-07-04 12:44:51.339243	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1107226},"duration":242}
77147	2025-07-04 12:44:55.65424	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77157	2025-07-04 12:45:04.221005	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77162	2025-07-04 12:45:06.612927	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77170	2025-07-04 12:45:18.855452	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":2084}}
77180	2025-07-04 12:45:19.745751	DEBUG	Starting: getDocuments	database	\N
77182	2025-07-04 12:45:19.824403	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77188	2025-07-04 12:45:20.640973	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77196	2025-07-04 12:45:20.68193	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":42}
77208	2025-07-04 12:45:33.766952	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
77213	2025-07-04 12:45:34.783207	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633134761,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77225	2025-07-04 12:45:35.355164	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77247	2025-07-04 12:45:36.777954	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
77625	2025-07-04 12:53:34.173884	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77842	2025-07-04 13:50:33.280028	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77844	2025-07-04 13:50:34.591853	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77848	2025-07-04 13:50:35.265513	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
77861	2025-07-04 13:50:36.319238	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77868	2025-07-04 13:50:37.044639	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77869	2025-07-04 13:50:37.818929	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77871	2025-07-04 13:50:37.927898	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":328},"duration":108}
77872	2025-07-04 13:50:38.767246	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
77880	2025-07-04 13:50:39.864075	INFO	Performance: getDocuments	database	{"duration":23}
77884	2025-07-04 13:50:40.545621	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
77921	2025-07-04 13:55:14.519203	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77923	2025-07-04 13:55:16.110052	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77944	2025-07-04 13:55:18.576377	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77951	2025-07-04 13:55:18.673747	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":868},"duration":106}
77961	2025-07-04 13:55:20.866138	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751637320842,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77976	2025-07-04 13:55:22.242742	INFO	Performance: getDocuments	database	{"duration":38}
77979	2025-07-04 13:55:23.282822	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77994	2025-07-04 14:00:36.50356	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
78008	2025-07-04 14:20:23.466492	DEBUG	Starting: getContractors	database	\N
78016	2025-07-04 14:20:23.504829	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":132}}
78026	2025-07-04 14:20:23.538862	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
78035	2025-07-04 14:20:23.572879	INFO	Performance: getInventory	database	{"meta":{},"duration":234}
78053	2025-07-04 14:34:36.347893	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78061	2025-07-04 14:34:36.886168	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"1199ms","forced":false}}
78072	2025-07-04 14:36:52.571012	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
78083	2025-07-04 14:36:52.610175	DEBUG	Starting: getProducts	database	\N
78091	2025-07-04 14:36:52.646508	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"242ms","forced":false}}
78100	2025-07-04 14:36:52.682456	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"249ms","forced":false}}
74374	2025-07-04 12:19:12.020593	DEBUG	Starting: getDocuments	database	\N
74384	2025-07-04 12:19:12.064369	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":29349}}
74392	2025-07-04 12:19:12.100813	INFO	Performance: getSuppliers	database	{"duration":501}
74401	2025-07-04 12:19:12.137403	INFO	Performance: getWarehouses	database	{"duration":507}
74410	2025-07-04 12:19:12.173998	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
74417	2025-07-04 12:19:12.419484	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"868ms","forced":false}}
74418	2025-07-04 12:19:15.042065	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74440	2025-07-04 12:19:28.308624	DEBUG	Starting: getDocuments	database	\N
74452	2025-07-04 12:19:29.172044	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74472	2025-07-04 12:19:30.781045	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74483	2025-07-04 12:19:31.473437	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74494	2025-07-04 12:19:34.121352	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76376	2025-07-04 12:34:16.168307	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632456022,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76394	2025-07-04 12:34:26.74107	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
77100	2025-07-04 12:44:47.486992	DEBUG	Starting: getContractors	database	\N
77110	2025-07-04 12:44:47.523421	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
77118	2025-07-04 12:44:47.560538	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
77136	2025-07-04 12:44:47.839409	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"525ms","forced":false}}
77139	2025-07-04 12:44:51.077581	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
77150	2025-07-04 12:44:55.659945	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77156	2025-07-04 12:45:04.218468	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77166	2025-07-04 12:45:06.615981	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77168	2025-07-04 12:45:16.815506	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77173	2025-07-04 12:45:18.856209	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
77181	2025-07-04 12:45:19.747081	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77184	2025-07-04 12:45:19.825617	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77193	2025-07-04 12:45:20.642376	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633120617,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77206	2025-07-04 12:45:33.732028	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633133710,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77221	2025-07-04 12:45:34.862468	INFO	Performance: getDocuments	database	{"duration":76}
77228	2025-07-04 12:45:35.355632	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77246	2025-07-04 12:45:36.740514	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77249	2025-07-04 12:45:36.779275	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":40}
77622	2025-07-04 12:53:34.172612	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77864	2025-07-04 13:50:36.32139	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":27}
77865	2025-07-04 13:50:37.025455	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77874	2025-07-04 13:50:38.787809	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77876	2025-07-04 13:50:39.811159	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":0}
77881	2025-07-04 13:50:39.864205	INFO	Retrieved all documents	api	{"meta":{"count":0,"entity":"Document"}}
77927	2025-07-04 13:55:16.110605	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77943	2025-07-04 13:55:18.575835	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77959	2025-07-04 13:55:20.865453	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77972	2025-07-04 13:55:22.203347	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
77977	2025-07-04 13:55:22.242695	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":2},"duration":40}
77981	2025-07-04 13:55:23.283269	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77995	2025-07-04 14:01:36.198494	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78010	2025-07-04 14:20:23.469435	DEBUG	Starting: getSuppliers	database	\N
78018	2025-07-04 14:20:23.505968	DEBUG	Starting: getProducts	database	\N
78030	2025-07-04 14:20:23.544074	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"236ms","forced":false}}
78042	2025-07-04 14:20:23.624468	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":328,"duration":"398ms","forced":false}}
78056	2025-07-04 14:34:36.378418	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"608ms","forced":false}}
78059	2025-07-04 14:34:36.885478	INFO	Performance: getInventory	database	{"meta":{},"duration":1197}
78074	2025-07-04 14:36:52.572465	DEBUG	Starting: getContractors	database	\N
78096	2025-07-04 14:36:52.659417	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
74375	2025-07-04 12:19:12.043952	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74385	2025-07-04 12:19:12.079318	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
74395	2025-07-04 12:19:12.11435	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
74404	2025-07-04 12:19:12.150767	INFO	Performance: getInventory	database	{"meta":{},"duration":507}
74413	2025-07-04 12:19:12.200755	INFO	Performance: getDocuments	database	{"duration":606}
74425	2025-07-04 12:19:15.249745	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":550257},"duration":190}
74426	2025-07-04 12:19:25.249263	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74428	2025-07-04 12:19:27.392498	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
74433	2025-07-04 12:19:28.306746	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74449	2025-07-04 12:19:29.171096	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631569150,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74462	2025-07-04 12:19:30.744956	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74471	2025-07-04 12:19:30.780846	INFO	Retrieved all shipments	app	{"meta":{"count":0,"entity":"Shipment"}}
74477	2025-07-04 12:19:31.471991	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631571450,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74492	2025-07-04 12:19:34.120449	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74498	2025-07-04 12:19:34.156971	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631574138,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76377	2025-07-04 12:34:16.172511	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
76388	2025-07-04 12:34:26.738978	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77101	2025-07-04 12:44:47.492192	DEBUG	Starting: getSuppliers	database	\N
77113	2025-07-04 12:44:47.529744	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
77120	2025-07-04 12:44:47.575236	INFO	Performance: getInventory	database	{"meta":{},"duration":514}
77132	2025-07-04 12:44:47.838593	INFO	Performance: getDocuments	database	{"duration":599}
77143	2025-07-04 12:44:51.083802	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77153	2025-07-04 12:44:55.908114	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1108794},"duration":233}
77155	2025-07-04 12:45:04.21443	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77179	2025-07-04 12:45:19.746497	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633119721,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77183	2025-07-04 12:45:19.824737	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":86}
77192	2025-07-04 12:45:20.642204	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77197	2025-07-04 12:45:20.682954	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633120662,"responseTime":42,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77202	2025-07-04 12:45:33.731276	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77214	2025-07-04 12:45:34.784369	DEBUG	Starting: getDocuments	database	\N
77223	2025-07-04 12:45:35.354124	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77244	2025-07-04 12:45:36.739223	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77624	2025-07-04 12:53:34.173829	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77934	2025-07-04 13:55:16.238749	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77937	2025-07-04 13:55:17.260507	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
77952	2025-07-04 13:55:18.679139	INFO	Performance: getShipments	database	{"duration":103}
77954	2025-07-04 13:55:19.771009	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
77955	2025-07-04 13:55:19.856307	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":328},"duration":83}
77966	2025-07-04 13:55:20.869694	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77973	2025-07-04 13:55:22.203572	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77984	2025-07-04 13:55:23.290768	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77996	2025-07-04 14:01:36.217766	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
78011	2025-07-04 14:20:23.469856	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
78019	2025-07-04 14:20:23.506526	INFO	Performance: getContractors	database	{"duration":225}
78028	2025-07-04 14:20:23.542086	INFO	Performance: getSuppliers	database	{"duration":232}
78038	2025-07-04 14:20:23.577724	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"241ms","forced":false}}
78057	2025-07-04 14:34:36.380206	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
78060	2025-07-04 14:34:36.885985	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
78075	2025-07-04 14:36:52.574513	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
78086	2025-07-04 14:36:52.61774	INFO	Performance: getWarehouses	database	{"duration":238}
78093	2025-07-04 14:36:52.653436	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"244ms","forced":false}}
78103	2025-07-04 14:36:52.689893	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":0}}
74376	2025-07-04 12:19:12.050655	DEBUG	Starting: getContractors	database	\N
74386	2025-07-04 12:19:12.08626	DEBUG	Starting: getProducts	database	\N
74396	2025-07-04 12:19:12.121503	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"505ms","forced":false}}
74405	2025-07-04 12:19:12.157205	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74415	2025-07-04 12:19:12.207298	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74424	2025-07-04 12:19:15.098447	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":47}
74427	2025-07-04 12:19:25.249601	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74431	2025-07-04 12:19:27.394795	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
74435	2025-07-04 12:19:28.307127	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74444	2025-07-04 12:19:28.385989	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74445	2025-07-04 12:19:29.16619	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74456	2025-07-04 12:19:29.208215	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631569188,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74459	2025-07-04 12:19:30.020649	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74468	2025-07-04 12:19:30.772967	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74480	2025-07-04 12:19:31.472557	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74495	2025-07-04 12:19:34.121673	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76378	2025-07-04 12:34:16.173675	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
76393	2025-07-04 12:34:26.740914	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632466719,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
77102	2025-07-04 12:44:47.492696	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
77112	2025-07-04 12:44:47.529771	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"504ms","forced":false}}
77119	2025-07-04 12:44:47.57285	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
77133	2025-07-04 12:44:47.838765	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77144	2025-07-04 12:44:51.119822	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":41}
77148	2025-07-04 12:44:55.657361	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77161	2025-07-04 12:45:04.516086	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1110957},"duration":271}
77163	2025-07-04 12:45:06.613341	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77171	2025-07-04 12:45:18.855743	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633118833,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
77178	2025-07-04 12:45:19.746329	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77191	2025-07-04 12:45:20.642074	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77203	2025-07-04 12:45:33.731526	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77215	2025-07-04 12:45:34.784336	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
77219	2025-07-04 12:45:34.861662	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":77}
77232	2025-07-04 12:45:35.390289	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"40ms","rowCount":1}}
77237	2025-07-04 12:45:36.308516	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":2},"duration":38}
77240	2025-07-04 12:45:36.735589	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77623	2025-07-04 12:53:34.174628	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77980	2025-07-04 13:55:23.283096	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
77997	2025-07-04 14:01:36.222759	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":596},"duration":1}
78012	2025-07-04 14:20:23.470395	DEBUG	Starting: getInventory	database	{"meta":{}}
78021	2025-07-04 14:20:23.508044	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
78029	2025-07-04 14:20:23.543856	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
78039	2025-07-04 14:20:23.580443	INFO	Performance: getDocuments	database	{"duration":236}
78044	2025-07-04 14:20:23.644956	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"419ms","forced":false}}
78058	2025-07-04 14:34:36.861781	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":6,"forced":false}}
78065	2025-07-04 14:34:36.899184	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
78076	2025-07-04 14:36:52.576521	DEBUG	Starting: getSuppliers	database	\N
78095	2025-07-04 14:36:52.656603	INFO	Performance: getInventory	database	{"meta":{},"duration":242}
78105	2025-07-04 14:36:52.694094	INFO	Performance: getContractors	database	{"duration":250}
78112	2025-07-04 14:36:52.747295	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"424ms","forced":false}}
78117	2025-07-04 14:36:59.203124	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":103}
78119	2025-07-04 14:36:59.314291	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74377	2025-07-04 12:19:12.052305	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
74387	2025-07-04 12:19:12.087306	DEBUG	Starting: getWarehouses	database	\N
74406	2025-07-04 12:19:12.159831	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":164,"duration":"512ms","forced":false}}
74414	2025-07-04 12:19:12.206823	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"614ms","forced":false}}
74420	2025-07-04 12:19:15.046351	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74441	2025-07-04 12:19:28.383967	INFO	Performance: getDocuments	database	{"duration":76}
74446	2025-07-04 12:19:29.166733	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74463	2025-07-04 12:19:30.745162	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631570725,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74474	2025-07-04 12:19:30.819758	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74476	2025-07-04 12:19:31.471645	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74493	2025-07-04 12:19:34.121391	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
76379	2025-07-04 12:34:16.177382	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632456014,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76390	2025-07-04 12:34:26.740002	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77103	2025-07-04 12:44:47.493207	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
77111	2025-07-04 12:44:47.529499	INFO	Performance: getSuppliers	database	{"duration":499}
77121	2025-07-04 12:44:47.575189	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"516ms","forced":false}}
77128	2025-07-04 12:44:47.614521	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"523ms","forced":false}}
77626	2025-07-04 12:53:34.707631	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77998	2025-07-04 14:01:36.223303	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
78013	2025-07-04 14:20:23.485784	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
78023	2025-07-04 14:20:23.522447	INFO	Performance: getProducts	database	{"duration":231}
78033	2025-07-04 14:20:23.5667	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
78062	2025-07-04 14:34:36.886386	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78077	2025-07-04 14:36:52.577121	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
78085	2025-07-04 14:36:52.617383	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
78094	2025-07-04 14:36:52.653837	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78104	2025-07-04 14:36:52.690718	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":2,"duration":"251ms","forced":false}}
78116	2025-07-04 14:36:59.1187	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78118	2025-07-04 14:36:59.313305	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":2}
74378	2025-07-04 12:19:12.055607	DEBUG	Starting: getSuppliers	database	\N
74389	2025-07-04 12:19:12.092752	DEBUG	Starting: getShipments	database	\N
74398	2025-07-04 12:19:12.130727	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":2}}
74407	2025-07-04 12:19:12.171118	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":548,"duration":"513ms","forced":false}}
74450	2025-07-04 12:19:29.171552	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74465	2025-07-04 12:19:30.746285	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74482	2025-07-04 12:19:31.473255	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74486	2025-07-04 12:19:31.512746	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631571493,"responseTime":40,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74488	2025-07-04 12:19:34.116249	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76380	2025-07-04 12:34:16.177947	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76389	2025-07-04 12:34:26.738891	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77104	2025-07-04 12:44:47.495783	DEBUG	Starting: getInventory	database	{"meta":{}}
77122	2025-07-04 12:44:47.577707	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
77137	2025-07-04 12:44:47.84245	INFO	Performance: getShipments	database	{"duration":577}
77140	2025-07-04 12:44:51.078049	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77151	2025-07-04 12:44:55.660565	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77159	2025-07-04 12:45:04.222792	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77167	2025-07-04 12:45:06.657554	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":41}
77169	2025-07-04 12:45:16.819343	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77174	2025-07-04 12:45:18.856996	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
77185	2025-07-04 12:45:19.827685	INFO	Performance: getDocuments	database	{"duration":84}
77194	2025-07-04 12:45:20.642545	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77207	2025-07-04 12:45:33.732636	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77218	2025-07-04 12:45:34.786041	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77222	2025-07-04 12:45:34.86285	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
77230	2025-07-04 12:45:35.356114	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77241	2025-07-04 12:45:36.737655	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
77627	2025-07-04 12:53:34.733235	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77999	2025-07-04 14:01:36.223733	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
78034	2025-07-04 14:20:23.56893	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"239ms","forced":false}}
78043	2025-07-04 14:20:23.643839	INFO	Performance: getShipments	database	{"duration":385}
78064	2025-07-04 14:34:36.890826	INFO	Performance: getProducts	database	{"duration":1202}
78078	2025-07-04 14:36:52.577628	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
78084	2025-07-04 14:36:52.615138	DEBUG	Starting: getShipments	database	\N
78092	2025-07-04 14:36:52.651824	INFO	Performance: getProducts	database	{"duration":243}
78102	2025-07-04 14:36:52.687706	INFO	Performance: getDocuments	database	{"duration":244}
74379	2025-07-04 12:19:12.056568	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
74388	2025-07-04 12:19:12.092588	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
74397	2025-07-04 12:19:12.128471	INFO	Performance: getContractors	database	{"duration":506}
74408	2025-07-04 12:19:12.171311	INFO	Performance: getProducts	database	{"duration":512}
74438	2025-07-04 12:19:28.308329	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74448	2025-07-04 12:19:29.170205	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74466	2025-07-04 12:19:30.746471	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74485	2025-07-04 12:19:31.511572	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
74497	2025-07-04 12:19:34.156654	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"38ms","rowCount":1}}
76381	2025-07-04 12:34:16.178507	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
76391	2025-07-04 12:34:26.740515	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77186	2025-07-04 12:45:19.880764	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77189	2025-07-04 12:45:20.641123	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77205	2025-07-04 12:45:33.731808	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77217	2025-07-04 12:45:34.785366	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77220	2025-07-04 12:45:34.862073	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
77226	2025-07-04 12:45:35.355308	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
77245	2025-07-04 12:45:36.739966	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77248	2025-07-04 12:45:36.778459	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633136760,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
77628	2025-07-04 12:53:34.734258	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77631	2025-07-04 12:53:34.818741	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1224}
78000	2025-07-04 14:01:36.224217	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78046	2025-07-04 14:20:23.647392	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":4}}
78066	2025-07-04 14:34:36.899447	INFO	Performance: getWarehouses	database	{"duration":1211}
78079	2025-07-04 14:36:52.594131	DEBUG	Starting: getInventory	database	{"meta":{}}
78087	2025-07-04 14:36:52.630425	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
78097	2025-07-04 14:36:52.665606	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"246ms","forced":false}}
78107	2025-07-04 14:36:52.700646	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"253ms","forced":false}}
78109	2025-07-04 14:36:52.744188	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":4}}
78113	2025-07-04 14:36:59.110832	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":9}
74380	2025-07-04 12:19:12.059946	DEBUG	Starting: getInventory	database	{"meta":{}}
74390	2025-07-04 12:19:12.098413	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74399	2025-07-04 12:19:12.133181	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":149,"duration":"508ms","forced":false}}
74416	2025-07-04 12:19:12.418809	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":300,"duration":"866ms","forced":false}}
74419	2025-07-04 12:19:15.044126	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":7}
74437	2025-07-04 12:19:28.308215	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74442	2025-07-04 12:19:28.384526	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74454	2025-07-04 12:19:29.20588	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
74460	2025-07-04 12:19:30.73442	INFO	GET /shipments	app	{"meta":{"method":"GET","url":"/api/shipments","bodySize":2}}
74469	2025-07-04 12:19:30.773884	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
74478	2025-07-04 12:19:31.472315	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74491	2025-07-04 12:19:34.120264	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76382	2025-07-04 12:34:16.179194	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76385	2025-07-04 12:34:26.735219	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632466715,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77198	2025-07-04 12:45:20.769146	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
77199	2025-07-04 12:45:33.729054	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77231	2025-07-04 12:45:35.356728	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
77242	2025-07-04 12:45:36.737823	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77629	2025-07-04 12:53:34.738336	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633613590,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
78001	2025-07-04 14:01:36.249385	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":169}
78080	2025-07-04 14:36:52.595974	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
78088	2025-07-04 14:36:52.633248	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"240ms","forced":false}}
78098	2025-07-04 14:36:52.669005	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
78110	2025-07-04 14:36:52.744652	INFO	Performance: getShipments	database	{"duration":386}
78114	2025-07-04 14:36:59.111363	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74381	2025-07-04 12:19:12.060205	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
74391	2025-07-04 12:19:12.100379	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"498ms","forced":false}}
74400	2025-07-04 12:19:12.137113	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":2}}
74409	2025-07-04 12:19:12.173694	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":3}}
74421	2025-07-04 12:19:15.050888	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74429	2025-07-04 12:19:27.393396	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
74436	2025-07-04 12:19:28.307924	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631568284,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74443	2025-07-04 12:19:28.385834	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":78}
74447	2025-07-04 12:19:29.167007	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74455	2025-07-04 12:19:29.207109	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
74457	2025-07-04 12:19:29.921767	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74458	2025-07-04 12:19:30.018788	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":97}
74461	2025-07-04 12:19:30.735118	INFO	GET /shipments	api	{"meta":{"method":"GET","url":"/shipments","bodySize":2}}
74470	2025-07-04 12:19:30.774132	INFO	Performance: getShipments	database	{"duration":37}
74481	2025-07-04 12:19:31.473132	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74490	2025-07-04 12:19:34.119709	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74499	2025-07-04 12:19:34.157352	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":40}
76384	2025-07-04 12:34:16.182774	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
76387	2025-07-04 12:34:26.736614	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
77630	2025-07-04 12:53:34.740018	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77633	2025-07-04 12:53:34.819744	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633614800,"responseTime":1225,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
78002	2025-07-04 14:01:36.497649	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1284664},"duration":397}
78081	2025-07-04 14:36:52.607344	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
78089	2025-07-04 14:36:52.643744	INFO	Performance: getSuppliers	database	{"duration":239}
78099	2025-07-04 14:36:52.679992	INFO	Performance: getInventory	database	{"meta":{},"duration":243}
78108	2025-07-04 14:36:52.71628	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":328,"duration":"336ms","forced":false}}
78120	2025-07-04 14:36:59.472729	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1310562},"duration":336}
74382	2025-07-04 12:19:12.063432	DEBUG	Starting: getInventory	database	{"meta":{}}
74394	2025-07-04 12:19:12.100736	INFO	Performance: getShipments	database	{"duration":467}
74403	2025-07-04 12:19:12.145174	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":145,"duration":"510ms","forced":false}}
74412	2025-07-04 12:19:12.199856	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":164,"duration":"516ms","forced":false}}
74423	2025-07-04 12:19:15.053825	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74432	2025-07-04 12:19:27.394774	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631567371,"responseTime":0,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
74434	2025-07-04 12:19:28.306604	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74451	2025-07-04 12:19:29.17177	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74467	2025-07-04 12:19:30.746735	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
74484	2025-07-04 12:19:31.474525	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74487	2025-07-04 12:19:31.512604	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":39}
74489	2025-07-04 12:19:34.117101	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76383	2025-07-04 12:34:16.182404	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
76386	2025-07-04 12:34:26.735791	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
77632	2025-07-04 12:53:34.818562	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"1221ms","rowCount":1}}
78106	2025-07-04 14:36:52.697121	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
78111	2025-07-04 14:36:52.746688	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":868,"duration":"423ms","forced":false}}
78115	2025-07-04 14:36:59.112997	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74383	2025-07-04 12:19:12.063933	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
74393	2025-07-04 12:19:12.100991	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74402	2025-07-04 12:19:12.137599	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":3}}
74411	2025-07-04 12:19:12.17417	INFO	Performance: getInventory	database	{"meta":{},"duration":509}
74422	2025-07-04 12:19:15.051622	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74430	2025-07-04 12:19:27.393815	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":2}
74439	2025-07-04 12:19:28.308452	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74453	2025-07-04 12:19:29.172467	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74464	2025-07-04 12:19:30.745375	DEBUG	Starting: getShipments	database	\N
74473	2025-07-04 12:19:30.781835	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":2},"duration":39}
74475	2025-07-04 12:19:30.820863	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":84}
74479	2025-07-04 12:19:31.472677	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74496	2025-07-04 12:19:34.121835	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631574100,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76395	2025-07-04 12:35:24.575887	DEBUG	Starting: getDocuments	database	\N
76399	2025-07-04 12:35:24.620731	DEBUG	Database operation started	database	{"meta":{"operation":"getSuppliers","module":"storage","queryType":"select"}}
76412	2025-07-04 12:35:24.662905	DEBUG	Starting: getProducts	database	\N
76423	2025-07-04 12:35:24.704053	INFO	Performance: getContractors	database	{"duration":557}
76433	2025-07-04 12:35:24.98331	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory/availability:all","description":"Доступность товаров","ttl":"60s","dataSize":659,"duration":"568ms","forced":false}}
76445	2025-07-04 12:35:28.755753	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":38}
76448	2025-07-04 12:35:39.006427	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
76450	2025-07-04 12:35:59.864019	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76462	2025-07-04 12:36:15.424684	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76468	2025-07-04 12:36:40.132916	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76475	2025-07-04 12:36:41.5219	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76482	2025-07-04 12:36:41.627852	INFO	Shipment created	database	{"meta":{"shipmentId":54,"orderId":1,"status":"draft"}}
76490	2025-07-04 12:36:41.663787	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":2,"responseSize":230}}
76498	2025-07-04 12:36:41.700002	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76511	2025-07-04 12:37:08.287469	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76520	2025-07-04 12:37:26.048724	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632646027,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76525	2025-07-04 12:37:26.11139	ERROR	POST /shipments - 500	api	{"meta":{"method":"POST","url":"/shipments","statusCode":500,"duration":40,"responseSize":64}}
76533	2025-07-04 12:37:26.147062	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76541	2025-07-04 12:37:26.183177	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76552	2025-07-04 12:37:32.322685	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77634	2025-07-04 12:54:41.555305	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
77643	2025-07-04 12:54:41.615843	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633681579,"responseTime":165,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
78121	2025-07-04 14:37:36.893724	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74500	2025-07-04 12:19:47.645962	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631587624,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74542	2025-07-04 12:20:11.471367	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
74544	2025-07-04 12:20:21.629946	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":606},"duration":1}
74546	2025-07-04 12:20:25.082313	INFO	GET /documents	api	{"meta":{"method":"GET","url":"/documents","bodySize":2}}
74553	2025-07-04 12:20:25.157598	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74558	2025-07-04 12:20:26.622506	INFO	Performance: GET /products	api	{"meta":{"statusCode":200,"responseSize":548},"duration":1}
74563	2025-07-04 12:20:27.304947	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":2}
76396	2025-07-04 12:35:24.606381	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
76406	2025-07-04 12:35:24.642672	INFO	Server started successfully	app	{"meta":{"port":5000,"host":"0.0.0.0","environment":"development","pid":32748}}
76416	2025-07-04 12:35:24.6816	INFO	Performance: getInventory	database	{"meta":{},"duration":551}
76426	2025-07-04 12:35:24.731078	INFO	Performance: getProducts	database	{"duration":561}
77635	2025-07-04 12:54:41.559427	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
77642	2025-07-04 12:54:41.611818	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":163}
78122	2025-07-04 14:37:36.896592	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74501	2025-07-04 12:19:47.646809	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74538	2025-07-04 12:20:11.433431	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":606},"duration":0}
74547	2025-07-04 12:20:25.083071	DEBUG	Starting: getDocuments	database	\N
74566	2025-07-04 12:20:27.306374	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74572	2025-07-04 12:20:27.344106	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":41}
74582	2025-07-04 12:20:37.488917	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76397	2025-07-04 12:35:24.614151	DEBUG	Starting: getContractors	database	\N
76407	2025-07-04 12:35:24.650667	INFO	Запуск разогрева кеша при старте сервера	app	{"meta":{"configs":9,"forced":false}}
76417	2025-07-04 12:35:24.687467	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76427	2025-07-04 12:35:24.731525	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/products:{}","description":"Список всех товаров","ttl":"600s","dataSize":2084,"duration":"562ms","forced":false}}
77636	2025-07-04 12:54:41.572359	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":2}
78123	2025-07-04 14:37:36.903586	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74502	2025-07-04 12:19:47.647172	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
76400	2025-07-04 12:35:24.620816	DEBUG	Starting: getSuppliers	database	\N
76411	2025-07-04 12:35:24.662231	DEBUG	Starting: getWarehouses	database	\N
76421	2025-07-04 12:35:24.70371	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/warehouses:{}","description":"Список складов","ttl":"900s","dataSize":649,"duration":"558ms","forced":false}}
76435	2025-07-04 12:35:25.095326	INFO	Performance: getDocuments	database	{"duration":1028}
76440	2025-07-04 12:35:28.714311	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
77637	2025-07-04 12:54:41.571973	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
78124	2025-07-04 14:37:36.908853	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74503	2025-07-04 12:19:47.647514	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74510	2025-07-04 12:19:47.686511	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":84},"duration":38}
74536	2025-07-04 12:20:11.429928	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74549	2025-07-04 12:20:25.083442	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631625057,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74555	2025-07-04 12:20:25.158093	INFO	Performance: GET /documents	api	{"meta":{"statusCode":200,"responseSize":236},"duration":83}
74560	2025-07-04 12:20:26.623105	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631626601,"responseTime":1,"endpoint":"/api/products","cacheHit":true,"dbQueries":0}}
74564	2025-07-04 12:20:27.305332	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74584	2025-07-04 12:20:37.489837	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
76398	2025-07-04 12:35:24.620489	DEBUG	Starting: getInventory	database	{"meta":{}}
76408	2025-07-04 12:35:24.659393	INFO	Performance: getShipments	database	{"duration":515}
76418	2025-07-04 12:35:24.696415	INFO	Кеш разогрет успешно	app	{"meta":{"key":"inventory:/inventory:all","description":"Остатки товаров","ttl":"60s","dataSize":659,"duration":"556ms","forced":false}}
76428	2025-07-04 12:35:24.73372	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76437	2025-07-04 12:35:25.124043	INFO	Разогрев кеша завершен	app	{"meta":{"successful":9,"failed":0,"total":9,"duration":"1036ms","forced":false}}
76446	2025-07-04 12:35:28.967353	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":962121},"duration":252}
76447	2025-07-04 12:35:39.002179	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76449	2025-07-04 12:35:59.863619	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
76463	2025-07-04 12:36:15.462714	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":39}
76466	2025-07-04 12:36:40.130529	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
76487	2025-07-04 12:36:41.635491	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632601614,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76495	2025-07-04 12:36:41.672388	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":18}}
77638	2025-07-04 12:54:41.574319	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
78125	2025-07-04 14:37:36.90964	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74504	2025-07-04 12:19:47.647735	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
76401	2025-07-04 12:35:24.62152	DEBUG	Database operation started	database	{"meta":{"operation":"getContractors","module":"storage","queryType":"select"}}
76409	2025-07-04 12:35:24.660284	DEBUG	Database operation started	database	{"meta":{"operation":"getShipments","module":"storage","queryType":"select"}}
76419	2025-07-04 12:35:24.697372	INFO	Performance: getWarehouses	database	{"duration":556}
76429	2025-07-04 12:35:24.737447	INFO	Performance: getInventory	database	{"meta":{},"duration":562}
76438	2025-07-04 12:35:25.124401	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/documents:{}","description":"Список документов","ttl":"300s","dataSize":236,"duration":"1035ms","forced":false}}
76439	2025-07-04 12:35:28.713116	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
77639	2025-07-04 12:54:41.575297	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
78126	2025-07-04 14:37:36.934676	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":170}
74505	2025-07-04 12:19:47.647945	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74539	2025-07-04 12:20:11.434577	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74548	2025-07-04 12:20:25.083236	DEBUG	Database operation started	database	{"meta":{"operation":"getDocuments","module":"storage","queryType":"select"}}
74568	2025-07-04 12:20:27.309692	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74585	2025-07-04 12:20:37.496676	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76402	2025-07-04 12:35:24.621896	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76410	2025-07-04 12:35:24.660409	DEBUG	Database operation started	database	{"meta":{"operation":"getWarehouses","module":"storage","queryType":"select"}}
76420	2025-07-04 12:35:24.69757	INFO	Database operation completed	database	{"meta":{"operation":"getWarehouses","module":"storage","duration":"undefinedms","resultCount":10}}
76430	2025-07-04 12:35:24.737658	INFO	Database operation completed	database	{"meta":{"operation":"getInventory","module":"storage","duration":"undefinedms","resultCount":11}}
76436	2025-07-04 12:35:25.095729	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
76441	2025-07-04 12:35:28.716231	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77640	2025-07-04 12:54:41.576722	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
78127	2025-07-04 14:37:36.964746	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
78129	2025-07-04 14:37:47.033668	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78131	2025-07-04 14:37:57.253205	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78133	2025-07-04 14:38:07.473798	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78135	2025-07-04 14:38:08.157138	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78137	2025-07-04 14:38:17.71475	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78140	2025-07-04 14:38:27.929796	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
78141	2025-07-04 14:38:38.144386	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78143	2025-07-04 14:38:39.44947	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78145	2025-07-04 14:38:48.36265	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78147	2025-07-04 14:38:58.626314	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78149	2025-07-04 14:39:08.885368	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78151	2025-07-04 14:39:10.743611	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78153	2025-07-04 14:39:19.148943	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78155	2025-07-04 14:39:29.422987	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
78157	2025-07-04 14:39:39.636082	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78159	2025-07-04 14:39:42.881883	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78161	2025-07-04 14:39:49.92589	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78163	2025-07-04 14:40:00.18022	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74506	2025-07-04 12:19:47.648139	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74540	2025-07-04 12:20:11.43585	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74552	2025-07-04 12:20:25.084139	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74556	2025-07-04 12:20:25.158523	INFO	Retrieved all documents	api	{"meta":{"count":1,"entity":"Document"}}
74561	2025-07-04 12:20:26.623311	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/products:{}","method":"GET","url":"/api/products"}}
74569	2025-07-04 12:20:27.310395	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74586	2025-07-04 12:20:37.49827	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76403	2025-07-04 12:35:24.626031	DEBUG	Starting: getInventory	database	{"meta":{}}
76413	2025-07-04 12:35:24.66376	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
76422	2025-07-04 12:35:24.70393	INFO	Database operation completed	database	{"meta":{"operation":"getContractors","module":"storage","duration":"undefinedms","resultCount":6}}
76432	2025-07-04 12:35:24.983149	INFO	Performance: getSuppliers	database	{"duration":567}
76442	2025-07-04 12:35:28.716408	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77641	2025-07-04 12:54:41.596286	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"161ms","rowCount":1}}
78128	2025-07-04 14:37:37.186548	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1311539},"duration":390}
78130	2025-07-04 14:37:47.034141	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78132	2025-07-04 14:37:57.253644	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78134	2025-07-04 14:38:07.474212	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78136	2025-07-04 14:38:08.459816	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1314269},"duration":283}
78138	2025-07-04 14:38:17.715162	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78139	2025-07-04 14:38:27.928562	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78142	2025-07-04 14:38:38.144878	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78144	2025-07-04 14:38:39.742495	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1315814},"duration":268}
78146	2025-07-04 14:38:48.36309	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78148	2025-07-04 14:38:58.626721	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78150	2025-07-04 14:39:08.885685	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78152	2025-07-04 14:39:11.037829	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1317359},"duration":274}
78154	2025-07-04 14:39:19.148863	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78156	2025-07-04 14:39:29.42339	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78158	2025-07-04 14:39:39.63649	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78160	2025-07-04 14:39:43.168876	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1318904},"duration":264}
78162	2025-07-04 14:39:49.926381	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78164	2025-07-04 14:40:00.18072	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74507	2025-07-04 12:19:47.648328	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74511	2025-07-04 12:19:47.687045	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631587667,"responseTime":39,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74537	2025-07-04 12:20:11.430365	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
74551	2025-07-04 12:20:25.083934	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74567	2025-07-04 12:20:27.306311	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74573	2025-07-04 12:20:27.344893	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631627326,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74575	2025-07-04 12:20:28.923192	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74577	2025-07-04 12:20:28.998838	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
74578	2025-07-04 12:20:33.069736	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74580	2025-07-04 12:20:33.143863	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
74588	2025-07-04 12:20:37.708379	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":582918},"duration":222}
74589	2025-07-04 12:20:47.743605	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74591	2025-07-04 12:20:57.941736	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74619	2025-07-04 12:21:08.197706	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74620	2025-07-04 12:21:08.534155	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74637	2025-07-04 12:21:18.438175	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":0}
74638	2025-07-04 12:21:19.950642	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
74651	2025-07-04 12:21:26.291564	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74656	2025-07-04 12:21:30.946959	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74675	2025-07-04 12:21:48.921612	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74688	2025-07-04 12:21:49.761836	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74703	2025-07-04 12:21:54.073857	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74710	2025-07-04 12:21:54.148861	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":82}
74726	2025-07-04 12:21:56.559464	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74728	2025-07-04 12:21:56.636028	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":76}
74737	2025-07-04 12:21:57.498948	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74756	2025-07-04 12:22:10.90215	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
74768	2025-07-04 12:22:14.38504	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74771	2025-07-04 12:22:14.458696	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
74772	2025-07-04 12:22:15.067235	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74774	2025-07-04 12:22:15.144912	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":73}
74778	2025-07-04 12:22:15.721063	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74794	2025-07-04 12:22:16.348306	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74804	2025-07-04 12:22:16.973352	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76404	2025-07-04 12:35:24.629781	DEBUG	Database operation started	database	{"meta":{"operation":"getInventory","module":"storage","queryType":"select"}}
76414	2025-07-04 12:35:24.667943	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/shipments:{}","description":"Список отгрузок","ttl":"300s","dataSize":2,"duration":"549ms","forced":false}}
76424	2025-07-04 12:35:24.709113	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/contractors:{}","description":"Список контрагентов","ttl":"900s","dataSize":453,"duration":"559ms","forced":false}}
76434	2025-07-04 12:35:24.983443	INFO	Database operation completed	database	{"meta":{"operation":"getSuppliers","module":"storage","duration":"undefinedms","resultCount":2}}
76443	2025-07-04 12:35:28.716831	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
77644	2025-07-04 12:54:41.683399	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
78165	2025-07-04 14:41:04.201011	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
74508	2025-07-04 12:19:47.648534	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
74541	2025-07-04 12:20:11.436072	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74550	2025-07-04 12:20:25.083631	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74571	2025-07-04 12:20:27.34298	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
74583	2025-07-04 12:20:37.48964	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
76405	2025-07-04 12:35:24.632595	DEBUG	Starting: getShipments	database	\N
76415	2025-07-04 12:35:24.671265	INFO	Материализованное представление использовано для getInventory	database	{"meta":{"rowCount":11}}
76425	2025-07-04 12:35:24.730628	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/orders:{}","description":"Список заказов","ttl":"300s","dataSize":2,"duration":"560ms","forced":false}}
76431	2025-07-04 12:35:24.982487	INFO	Кеш разогрет успешно	app	{"meta":{"key":"http:/api/suppliers:{}","description":"Список поставщиков","ttl":"900s","dataSize":139,"duration":"571ms","forced":false}}
76444	2025-07-04 12:35:28.717801	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77645	2025-07-04 12:54:41.684208	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633681423,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
78166	2025-07-04 14:41:04.207231	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74509	2025-07-04 12:19:47.684797	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"35ms","rowCount":1}}
74543	2025-07-04 12:20:11.64639	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":574212},"duration":202}
74545	2025-07-04 12:20:21.630343	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74554	2025-07-04 12:20:25.15793	INFO	Performance: getDocuments	database	{"duration":81}
74559	2025-07-04 12:20:26.622933	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/products:{}","dataSize":548}}
74565	2025-07-04 12:20:27.305505	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631627282,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
76451	2025-07-04 12:35:59.981987	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76461	2025-07-04 12:36:15.423071	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
76467	2025-07-04 12:36:40.132436	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
76481	2025-07-04 12:36:41.588812	INFO	POST /shipments	api	{"meta":{"method":"POST","url":"/shipments","bodySize":121}}
76483	2025-07-04 12:36:41.62854	INFO	Shipment created via service	app	{"meta":{"shipmentId":54,"orderId":1,"status":"draft"}}
76492	2025-07-04 12:36:41.665189	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76499	2025-07-04 12:36:41.700194	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632601635,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76510	2025-07-04 12:37:08.286452	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76518	2025-07-04 12:37:26.048214	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
76528	2025-07-04 12:37:26.117471	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76536	2025-07-04 12:37:26.153217	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77646	2025-07-04 12:56:01.399502	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":649}}
77656	2025-07-04 12:56:01.463045	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":185}
78167	2025-07-04 14:41:04.207819	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
74512	2025-07-04 12:19:55.982031	INFO	Performance: getShipments	database	{"duration":196}
74517	2025-07-04 12:19:56.244329	INFO	Shipment created via service	app	{"meta":{"shipmentId":18,"orderId":1,"status":"draft"}}
74519	2025-07-04 12:19:56.454154	INFO	Shipment created	database	{"meta":{"shipmentId":19,"orderId":1,"status":"draft"}}
74525	2025-07-04 12:19:56.656142	INFO	Shipment items created	database	{"meta":{"shipmentId":20,"itemsCount":1}}
74530	2025-07-04 12:19:56.850535	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":20}}
74533	2025-07-04 12:19:56.92635	INFO	Shipment created	database	{"meta":{"shipmentId":21,"orderId":1,"status":"draft"}}
76452	2025-07-04 12:35:59.990162	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76460	2025-07-04 12:36:15.42152	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76469	2025-07-04 12:36:40.134065	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76474	2025-07-04 12:36:41.521686	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
76480	2025-07-04 12:36:41.561344	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632601541,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
76485	2025-07-04 12:36:41.628512	ERROR	Error in POST /shipments	app	{"meta":{"error":"CacheService is not defined","body":{"orderId":1,"date":"2025-07-04","status":"draft","warehouseId":139}}}
76493	2025-07-04 12:36:41.665431	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632601625,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76501	2025-07-04 12:36:41.702536	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76508	2025-07-04 12:37:08.280065	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76522	2025-07-04 12:37:26.06938	INFO	POST /shipments	api	{"meta":{"method":"POST","url":"/shipments","bodySize":121}}
76524	2025-07-04 12:37:26.109842	INFO	Shipment created via service	app	{"meta":{"shipmentId":55,"orderId":1,"status":"draft"}}
76532	2025-07-04 12:37:26.145433	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76540	2025-07-04 12:37:26.182946	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632646119,"responseTime":1,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76555	2025-07-04 12:37:32.580325	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":985798},"duration":244}
77647	2025-07-04 12:56:01.412234	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633761251,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
77657	2025-07-04 12:56:01.466848	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751633761444,"responseTime":185,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
78168	2025-07-04 14:41:04.221857	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74513	2025-07-04 12:19:56.101725	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":0}}
74515	2025-07-04 12:19:56.24284	INFO	Shipment items created	database	{"meta":{"shipmentId":18,"itemsCount":1}}
74518	2025-07-04 12:19:56.452423	INFO	Shipment created via service	app	{"meta":{"shipmentId":19,"orderId":1,"status":"draft"}}
74527	2025-07-04 12:19:56.727732	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":20,"itemsCount":1}}
74529	2025-07-04 12:19:56.810439	INFO	Shipment deleted via service	app	{"meta":{"shipmentId":20}}
74531	2025-07-04 12:19:56.924571	INFO	Shipment items created	database	{"meta":{"shipmentId":21,"itemsCount":1}}
74535	2025-07-04 12:19:56.972522	INFO	Multiple shipments deleted via service	app	{"meta":{"requestedCount":1,"deletedCount":1}}
76453	2025-07-04 12:35:59.996245	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
76459	2025-07-04 12:36:15.419961	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76472	2025-07-04 12:36:40.398725	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":968370},"duration":249}
76476	2025-07-04 12:36:41.522662	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76479	2025-07-04 12:36:41.561206	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":41}
76489	2025-07-04 12:36:41.636465	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76497	2025-07-04 12:36:41.674041	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":1,"responseSize":230}}
76512	2025-07-04 12:37:08.288055	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":3}
76521	2025-07-04 12:37:26.049642	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76526	2025-07-04 12:37:26.111574	ERROR	Error in POST /shipments	app	{"meta":{"error":"CacheService is not defined","body":{"orderId":1,"date":"2025-07-04","status":"draft","warehouseId":139}}}
76534	2025-07-04 12:37:26.150404	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632646107,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76543	2025-07-04 12:37:26.187592	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76551	2025-07-04 12:37:32.321503	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
77648	2025-07-04 12:56:01.415903	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
78169	2025-07-04 14:41:04.223791	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":0}
74514	2025-07-04 12:19:56.148376	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":99999}}
74516	2025-07-04 12:19:56.243174	INFO	Shipment created	database	{"meta":{"shipmentId":18,"orderId":1,"status":"draft"}}
74521	2025-07-04 12:19:56.526222	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":19,"itemsCount":1}}
74522	2025-07-04 12:19:56.568375	INFO	Shipment updated via service	app	{"meta":{"shipmentId":19,"updatedFields":["status"],"status":"shipped"}}
74524	2025-07-04 12:19:56.654814	INFO	Shipment created via service	app	{"meta":{"shipmentId":20,"orderId":1,"status":"draft"}}
74534	2025-07-04 12:19:56.972153	INFO	Performance: batchDeleteShipments	database	{"duration":36}
76454	2025-07-04 12:35:59.996879	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76464	2025-07-04 12:36:15.695073	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":966038},"duration":255}
76465	2025-07-04 12:36:40.128202	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76488	2025-07-04 12:36:41.635908	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76496	2025-07-04 12:36:41.672831	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
77649	2025-07-04 12:56:01.420328	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":649},"duration":1}
78170	2025-07-04 14:41:04.226411	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
74520	2025-07-04 12:19:56.4544	INFO	Shipment items created	database	{"meta":{"shipmentId":19,"itemsCount":1}}
74523	2025-07-04 12:19:56.571412	INFO	Shipment updated	database	{"meta":{"shipmentId":19,"updatedFields":["status"],"status":"shipped"}}
74526	2025-07-04 12:19:56.659969	INFO	Shipment created	database	{"meta":{"shipmentId":20,"orderId":1,"status":"draft"}}
74528	2025-07-04 12:19:56.810126	INFO	Shipment deleted	database	{"meta":{"shipmentId":20}}
74532	2025-07-04 12:19:56.924952	INFO	Shipment created via service	app	{"meta":{"shipmentId":21,"orderId":1,"status":"draft"}}
76455	2025-07-04 12:36:00.02474	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":153}
76457	2025-07-04 12:36:15.415225	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":5}
76470	2025-07-04 12:36:40.134828	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
76477	2025-07-04 12:36:41.559112	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"37ms","rowCount":1}}
76486	2025-07-04 12:36:41.634633	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76494	2025-07-04 12:36:41.669823	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76502	2025-07-04 12:36:41.70367	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
76513	2025-07-04 12:37:08.316124	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":37}
76515	2025-07-04 12:37:18.478344	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":415},"duration":1}
76517	2025-07-04 12:37:26.047783	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76527	2025-07-04 12:37:26.117229	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751632646095,"responseTime":0,"endpoint":"/api/inventory/availability","cacheHit":true,"dbQueries":0}}
76535	2025-07-04 12:37:26.151859	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76542	2025-07-04 12:37:26.186824	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
76550	2025-07-04 12:37:32.319623	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":419},"duration":1}
77650	2025-07-04 12:56:01.421331	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
78171	2025-07-04 14:41:04.261374	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":166}
78174	2025-07-04 14:41:14.33716	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78176	2025-07-04 14:41:24.547315	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78178	2025-07-04 14:41:34.776895	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78180	2025-07-04 14:41:36.091124	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1322792},"duration":293}
78182	2025-07-04 14:41:45.030645	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78184	2025-07-04 14:41:55.258178	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74557	2025-07-04 12:20:25.219181	INFO	Performance: GET /warehouses	api	{"meta":{"statusCode":200,"responseSize":145},"duration":1}
74562	2025-07-04 12:20:26.623516	INFO	GET /products	api	{"meta":{"method":"GET","url":"/products","bodySize":2}}
74570	2025-07-04 12:20:27.310931	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74587	2025-07-04 12:20:37.537068	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":53}
74590	2025-07-04 12:20:47.74395	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":605},"duration":1}
74592	2025-07-04 12:20:57.942298	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74618	2025-07-04 12:21:08.197387	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74621	2025-07-04 12:21:08.7651	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":590610},"duration":222}
74636	2025-07-04 12:21:18.437974	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
74639	2025-07-04 12:21:19.952627	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74653	2025-07-04 12:21:26.533057	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":596462},"duration":222}
74655	2025-07-04 12:21:30.945481	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
74674	2025-07-04 12:21:48.921163	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
74677	2025-07-04 12:21:48.995497	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74685	2025-07-04 12:21:49.761076	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74702	2025-07-04 12:21:54.073342	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74709	2025-07-04 12:21:54.145846	INFO	Performance: GET /shipments	api	{"meta":{"statusCode":200,"responseSize":1337},"duration":84}
74734	2025-07-04 12:21:57.493912	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74746	2025-07-04 12:21:59.105564	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74749	2025-07-04 12:22:10.896456	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631730876,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74780	2025-07-04 12:22:15.721833	DEBUG	Cache hit	app	{"meta":{"key":"http:/api/warehouses:{}","dataSize":145}}
74791	2025-07-04 12:22:16.347532	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631736326,"responseTime":1,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74795	2025-07-04 12:22:16.418705	INFO	Database operation completed	database	{"meta":{"operation":"getDocuments","module":"storage","duration":"undefinedms","resultCount":1}}
74805	2025-07-04 12:22:16.973526	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631736948,"responseTime":0,"endpoint":"/api/warehouses","cacheHit":true,"dbQueries":0}}
74809	2025-07-04 12:22:17.013582	DEBUG	Performance metric recorded	app	{"meta":{"timestamp":1751631736993,"responseTime":41,"endpoint":"/api/inventory/availability","cacheHit":false,"dbQueries":1}}
74811	2025-07-04 12:22:17.570224	INFO	GET /orders	api	{"meta":{"method":"GET","url":"/orders","bodySize":2}}
74813	2025-07-04 12:22:17.648454	INFO	Performance: GET /orders	api	{"meta":{"statusCode":200,"responseSize":300},"duration":77}
74814	2025-07-04 12:22:18.099714	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74829	2025-07-04 12:22:21.546117	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
76456	2025-07-04 12:36:00.246256	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":964470},"duration":374}
76458	2025-07-04 12:36:15.415636	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
76471	2025-07-04 12:36:40.176642	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":42}
76473	2025-07-04 12:36:41.521434	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76478	2025-07-04 12:36:41.560998	DEBUG	Response cached	app	{"meta":{"key":"inventory:/availability:all","size":91}}
76484	2025-07-04 12:36:41.628714	ERROR	POST /shipments - 500	api	{"meta":{"method":"POST","url":"/shipments","statusCode":500,"duration":40,"responseSize":64}}
76491	2025-07-04 12:36:41.665006	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76500	2025-07-04 12:36:41.700419	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76514	2025-07-04 12:37:08.534279	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":976875},"duration":237}
76516	2025-07-04 12:37:18.478818	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76519	2025-07-04 12:37:26.048359	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76529	2025-07-04 12:37:26.117626	DEBUG	Cache lookup attempt	app	{"meta":{"key":"inventory:/availability:all","method":"GET","url":"/api/inventory/availability"}}
76537	2025-07-04 12:37:26.153368	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":18}}
77651	2025-07-04 12:56:01.424479	DEBUG	Cache lookup attempt	app	{"meta":{"key":"http:/api/warehouses:{}","method":"GET","url":"/api/warehouses"}}
78172	2025-07-04 14:41:04.579902	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":1321428},"duration":471}
78173	2025-07-04 14:41:14.336737	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
78175	2025-07-04 14:41:24.546892	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78177	2025-07-04 14:41:34.776422	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78179	2025-07-04 14:41:35.768097	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
78181	2025-07-04 14:41:45.030055	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
78183	2025-07-04 14:41:55.257633	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":305},"duration":1}
74574	2025-07-04 12:20:27.420946	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
74576	2025-07-04 12:20:28.99814	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74579	2025-07-04 12:20:33.143299	INFO	Retrieved all orders	api	{"meta":{"count":1,"entity":"Order"}}
74581	2025-07-04 12:20:37.477451	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
76503	2025-07-04 12:36:41.758633	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":1}
76505	2025-07-04 12:36:50.357267	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":415},"duration":1}
76507	2025-07-04 12:37:08.279724	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":415},"duration":1}
76523	2025-07-04 12:37:26.108354	INFO	Shipment created	database	{"meta":{"shipmentId":55,"orderId":1,"status":"draft"}}
76531	2025-07-04 12:37:26.144369	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":1,"responseSize":230}}
76539	2025-07-04 12:37:26.180925	INFO	GET /inventory/availability	api	{"meta":{"method":"GET","url":"/inventory/availability","bodySize":2}}
76554	2025-07-04 12:37:32.363964	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":24},"duration":41}
77652	2025-07-04 12:56:01.426609	DEBUG	Cache miss	app	{"meta":{"key":"inventory:/availability:all"}}
74593	2025-07-04 12:21:04.169821	INFO	Performance: getShipments	database	{"duration":240}
74596	2025-07-04 12:21:04.428053	INFO	Shipment items created	database	{"meta":{"shipmentId":22,"itemsCount":1}}
74602	2025-07-04 12:21:04.719589	INFO	Database operation completed	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":23,"itemsCount":1}}
74607	2025-07-04 12:21:04.84719	INFO	Shipment created via service	app	{"meta":{"shipmentId":24,"orderId":1,"status":"draft"}}
74609	2025-07-04 12:21:05.117205	INFO	Shipment deleted	database	{"meta":{"shipmentId":24}}
74612	2025-07-04 12:21:05.231667	INFO	Shipment items created	database	{"meta":{"shipmentId":25,"itemsCount":1}}
76504	2025-07-04 12:36:41.761273	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":20}}
76506	2025-07-04 12:36:50.358592	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76509	2025-07-04 12:37:08.280267	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76530	2025-07-04 12:37:26.118952	DEBUG	Cache hit	app	{"meta":{"key":"inventory:/availability:all","dataSize":91}}
76538	2025-07-04 12:37:26.155892	ERROR	PUT /shipments/undefined - 400	api	{"meta":{"method":"PUT","url":"/shipments/undefined","statusCode":400,"duration":0,"responseSize":230}}
76553	2025-07-04 12:37:32.325848	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
77653	2025-07-04 12:56:01.42788	INFO	GET /warehouses	api	{"meta":{"method":"GET","url":"/warehouses","bodySize":2}}
74594	2025-07-04 12:21:04.292286	INFO	Database operation completed	database	{"meta":{"operation":"getShipments","module":"storage","duration":"undefinedms","resultCount":2}}
74597	2025-07-04 12:21:04.429054	INFO	Shipment created via service	app	{"meta":{"shipmentId":22,"orderId":1,"status":"draft"}}
74599	2025-07-04 12:21:04.637075	INFO	Shipment created via service	app	{"meta":{"shipmentId":23,"orderId":1,"status":"draft"}}
74605	2025-07-04 12:21:04.846085	INFO	Shipment items created	database	{"meta":{"shipmentId":24,"itemsCount":1}}
74615	2025-07-04 12:21:05.270749	INFO	Performance: batchDeleteShipments	database	{"duration":37}
76544	2025-07-04 12:37:26.255866	INFO	PUT /shipments/undefined	api	{"meta":{"method":"PUT","url":"/shipments/undefined","bodySize":20}}
76547	2025-07-04 12:37:28.689253	INFO	Performance: GET /metrics	api	{"meta":{"statusCode":200,"responseSize":419},"duration":1}
76548	2025-07-04 12:37:32.318008	INFO	GET /changelog	api	{"meta":{"method":"GET","url":"/changelog","bodySize":2}}
77654	2025-07-04 12:56:01.428918	INFO	[MATERIALIZED] Starting getInventoryAvailability query	database	\N
71743	2025-07-04 11:39:51.598718	INFO	Performance: DELETE /logs	api	{"meta":{"statusCode":200,"responseSize":75},"duration":43}
71746	2025-07-04 11:39:51.80778	INFO	Performance: GET /logs	api	{"meta":{"statusCode":200,"responseSize":421},"duration":38}
71748	2025-07-04 11:39:52.019267	INFO	Performance: GET /logs/modules	api	{"meta":{"statusCode":200,"responseSize":18},"duration":39}
74595	2025-07-04 12:21:04.345798	INFO	Shipment not found	database	{"meta":{"operation":"getShipment","module":"storage","shipmentId":99999}}
74598	2025-07-04 12:21:04.43562	INFO	Shipment created	database	{"meta":{"shipmentId":22,"orderId":1,"status":"draft"}}
74600	2025-07-04 12:21:04.638061	INFO	Shipment created	database	{"meta":{"shipmentId":23,"orderId":1,"status":"draft"}}
74604	2025-07-04 12:21:04.827604	INFO	Shipment updated via service	app	{"meta":{"shipmentId":23,"updatedFields":["status"],"status":"shipped"}}
74616	2025-07-04 12:21:05.271702	INFO	Multiple shipments deleted via service	app	{"meta":{"requestedCount":1,"deletedCount":1}}
76545	2025-07-04 12:37:26.267952	INFO	Performance: GET /inventory/availability	api	{"meta":{"statusCode":200,"responseSize":91},"duration":2}
76546	2025-07-04 12:37:28.687986	INFO	GET /metrics	api	{"meta":{"method":"GET","url":"/metrics","bodySize":2}}
76549	2025-07-04 12:37:32.318655	INFO	Performance: GET /changelog	api	{"meta":{"statusCode":200,"responseSize":63560},"duration":4}
77655	2025-07-04 12:56:01.461147	INFO	[MATERIALIZED] getInventoryAvailability completed	database	{"meta":{"duration":"182ms","rowCount":1}}
71744	2025-07-04 11:39:51.59905	INFO	Log entries cleared	database	{"meta":{"operation":"clearAllLogs","module":"storage","clearedCount":1205}}
71745	2025-07-04 11:39:51.770534	INFO	GET /logs	api	{"meta":{"method":"GET","url":"/logs","bodySize":2}}
71747	2025-07-04 11:39:51.980343	INFO	GET /logs/modules	api	{"meta":{"method":"GET","url":"/logs/modules","bodySize":2}}
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.order_items (id, order_id, product_id, quantity, price) FROM stdin;
120	93	443	1.000	100.00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.orders (id, name, status, customer_id, warehouse_id, total_amount, notes, date, created_at, is_reserved, updated_at) FROM stdin;
93	Заказ 04.07-1	Новый	8	139	100.00	Заказ для тестирования отгрузок	2025-07-04	2025-07-04 12:48:31.875391	f	2025-07-04 12:48:31.875391
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, name, sku, price, purchase_price, barcode, weight, length, width, height) FROM stdin;
436	Товар для отгрузки 1	SHIP001	250.00	200.00	1234567890123	1.500	\N	\N	\N
437	Товар для отгрузки 2	SHIP002	150.00	120.00	1234567890124	0.800	\N	\N	\N
438	Товар для отгрузки 3	SHIP003	99.99	75.00	1234567890125	2.100	\N	\N	\N
439	Тестовый продукт для отгрузки	TEST-SHIP-001	1000.00	800.00	\N	\N	\N	\N	\N
440	Продукт для отмены отгрузки	TEST-CANCEL-001	500.00	400.00	\N	\N	\N	\N	\N
443	Тестовый продукт для отгрузки	TEST-SHIP-1751631763403	1000.00	800.00	\N	\N	\N	\N	\N
444	Продукт для отмены отгрузки	TEST-CANCEL-1751631763738	500.00	400.00	\N	\N	\N	\N	\N
445	Тестовый продукт для отгрузки	TEST-SHIP-1751631908128	1000.00	800.00	\N	\N	\N	\N	\N
446	Продукт для отмены отгрузки	TEST-CANCEL-1751631908591	500.00	400.00	\N	\N	\N	\N	\N
447	Тестовый продукт для отгрузки	TEST-SHIP-1751632009244	1000.00	800.00	\N	\N	\N	\N	\N
448	Продукт для отмены отгрузки	TEST-CANCEL-1751632010368	500.00	400.00	\N	\N	\N	\N	\N
\.


--
-- Data for Name: reserves; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reserves (id, order_id, product_id, warehouse_id, quantity, created_at) FROM stdin;
\.


--
-- Data for Name: shipment_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shipment_items (id, shipment_id, product_id, quantity, price) FROM stdin;
11	21	1	1.000	100.00
15	25	1	1.000	100.00
19	56	443	5.000	100.00
20	57	443	5.000	100.00
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shipments (id, order_id, date, status, warehouse_id, responsible_user_id, comments, created_at, updated_at) FROM stdin;
54	1	2025-07-04	draft	139	\N	\N	2025-07-04 12:36:41.589366	2025-07-04 12:36:41.589366
55	1	2025-07-04	draft	139	\N	\N	2025-07-04 12:37:26.069167	2025-07-04 12:37:26.069167
56	1	2025-07-04	draft	139	\N	\N	2025-07-04 12:37:42.531806	2025-07-04 15:37:43.26
57	93	2025-07-04	shipped	139	\N	\N	2025-07-04 12:48:14.368134	2025-07-04 15:48:45.632
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.suppliers (id, name, website) FROM stdin;
5	СтрессПоставщик1	https://supplier1.com
6	СтрессПоставщик2	https://supplier2.com
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, username, password, role) FROM stdin;
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.warehouses (id, name, address) FROM stdin;
139	Склад для отгрузок	Адрес склада
140	Склад для отмены	Адрес склада
141	Склад для отгрузок	Адрес склада
142	Склад для отмены	Адрес склада
143	Склад для отгрузок	Адрес склада
144	Склад для отмены	Адрес склада
145	Склад для отгрузок	Адрес склада
146	Склад для отмены	Адрес склада
117	СтрессСклад1	ул. Складская 1, г. Москва
118	СтрессСклад2	ул. Складская 2, г. Москва
\.


--
-- Name: contractors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.contractors_id_seq', 179, true);


--
-- Name: document_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.document_items_id_seq', 334, true);


--
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.documents_id_seq', 305, true);


--
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.inventory_id_seq', 306, true);


--
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.logs_id_seq', 78184, true);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.order_items_id_seq', 120, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.orders_id_seq', 93, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.products_id_seq', 448, true);


--
-- Name: reserves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.reserves_id_seq', 91, true);


--
-- Name: shipment_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.shipment_items_id_seq', 20, true);


--
-- Name: shipments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.shipments_id_seq', 57, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 54, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: warehouses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.warehouses_id_seq', 146, true);


--
-- Name: contractors contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contractors
    ADD CONSTRAINT contractors_pkey PRIMARY KEY (id);


--
-- Name: document_items document_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_items
    ADD CONSTRAINT document_items_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: reserves reserves_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reserves
    ADD CONSTRAINT reserves_pkey PRIMARY KEY (id);


--
-- Name: shipment_items shipment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipment_items
    ADD CONSTRAINT shipment_items_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: inventory_product_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_product_date_idx ON public.inventory USING btree (product_id, created_at);


--
-- Name: inventory_product_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_product_type_idx ON public.inventory USING btree (product_id, movement_type);


--
-- Name: logs_level_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX logs_level_idx ON public.logs USING btree (level);


--
-- Name: logs_module_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX logs_module_idx ON public.logs USING btree (module);


--
-- Name: logs_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX logs_timestamp_idx ON public.logs USING btree ("timestamp");


--
-- Name: orders_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX orders_date_idx ON public.orders USING btree (date);


--
-- Name: orders_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX orders_status_idx ON public.orders USING btree (status);


--
-- Name: reserves_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reserves_order_idx ON public.reserves USING btree (order_id);


--
-- Name: reserves_product_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reserves_product_idx ON public.reserves USING btree (product_id);


--
-- Name: reserves_warehouse_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX reserves_warehouse_idx ON public.reserves USING btree (warehouse_id);


--
-- Name: shipments_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX shipments_date_idx ON public.shipments USING btree (date);


--
-- Name: shipments_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX shipments_order_idx ON public.shipments USING btree (order_id);


--
-- Name: shipments_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX shipments_status_idx ON public.shipments USING btree (status);


--
-- Name: inventory trg_atomic_refresh_on_inventory; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_atomic_refresh_on_inventory AFTER INSERT OR DELETE OR UPDATE ON public.inventory FOR EACH STATEMENT EXECUTE FUNCTION public.atomic_refresh_inventory_views();


--
-- Name: reserves trg_atomic_refresh_on_reserves; Type: TRIGGER; Schema: public; Owner: neondb_owner
--

CREATE TRIGGER trg_atomic_refresh_on_reserves AFTER INSERT OR DELETE OR UPDATE ON public.reserves FOR EACH STATEMENT EXECUTE FUNCTION public.atomic_refresh_inventory_views();


--
-- Name: documents documents_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- Name: inventory_availability; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: neondb_owner
--

REFRESH MATERIALIZED VIEW public.inventory_availability;


--
-- Name: inventory_summary; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: neondb_owner
--

REFRESH MATERIALIZED VIEW public.inventory_summary;


--
-- PostgreSQL database dump complete
--

