ALTER TABLE public.orders ADD CONSTRAINT IF NOT EXISTS orders_order_number_unique UNIQUE (order_number);
