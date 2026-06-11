DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Trade_order_type' AND e.enumlabel = '매수'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Trade_order_type' AND e.enumlabel = 'BUY'
  ) THEN
    ALTER TYPE "Trade_order_type" RENAME VALUE '매수' TO 'BUY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Trade_order_type' AND e.enumlabel = '매도'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Trade_order_type' AND e.enumlabel = 'SELL'
  ) THEN
    ALTER TYPE "Trade_order_type" RENAME VALUE '매도' TO 'SELL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = '매수'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'BUY'
  ) THEN
    ALTER TYPE "Order_book_side" RENAME VALUE '매수' TO 'BUY';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = '매도'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'SELL'
  ) THEN
    ALTER TYPE "Order_book_side" RENAME VALUE '매도' TO 'SELL';
  END IF;
END $$;
