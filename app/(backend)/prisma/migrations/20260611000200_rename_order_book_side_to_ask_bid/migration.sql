DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'SELL'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'ASK'
  ) THEN
    ALTER TYPE "Order_book_side" RENAME VALUE 'SELL' TO 'ASK';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'BUY'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Order_book_side' AND e.enumlabel = 'BID'
  ) THEN
    ALTER TYPE "Order_book_side" RENAME VALUE 'BUY' TO 'BID';
  END IF;
END $$;
