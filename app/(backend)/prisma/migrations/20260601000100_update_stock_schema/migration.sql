-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EducationSummaryLabel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Quiz_type" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "InvestmentType" AS ENUM ('AGGRESSIVE', 'ACTIVE', 'BALANCED', 'CONSERVATIVE', 'STABLE');

-- CreateEnum
CREATE TYPE "User_type" AS ENUM ('NORMAL', 'AGENT');

-- CreateEnum
CREATE TYPE "Trade_order_type" AS ENUM ('매수', '매도');

-- CreateEnum
CREATE TYPE "Trade_order_status" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Order_book_side" AS ENUM ('매도', '매수');

-- CreateEnum
CREATE TYPE "Currency_code" AS ENUM ('KRW', 'USD');

-- CreateEnum
CREATE TYPE "Dividend_status" AS ENUM ('expected', 'pending', 'received');

-- CreateEnum
CREATE TYPE "Transaction_type" AS ENUM ('buy', 'sell', 'exchange', 'deposit', 'withdrawal', 'dividend');

-- CreateEnum
CREATE TYPE "Agent_type" AS ENUM ('AGGRESSIVE', 'CONSERVATIVE', 'MOMENTUM', 'VALUE', 'FX_FOCUSED');

-- CreateEnum
CREATE TYPE "Trade_frequency" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Stock_sector" AS ENUM ('TECH', 'BIO', 'FINANCE', 'CONSUMER');

-- CreateEnum
CREATE TYPE "Stock_risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Stock_theme" AS ENUM ('AI', 'SEMICONDUCTOR', 'CLOUD', 'PHARMACEUTICAL', 'MEDICAL_DEVICE', 'HEALTHCARE_SERVICE', 'BANKING', 'SECURITIES', 'PAYMENT', 'E_COMMERCE', 'FOOD_BEVERAGE', 'CONTENT');

-- CreateEnum
CREATE TYPE "Stock_market_status" AS ENUM ('LISTED', 'IPO', 'PRE_LISTING');

-- CreateEnum
CREATE TYPE "Statement_type" AS ENUM ('INCOME_STATEMENT', 'BALANCE_SHEET', 'CASH_FLOW');

-- CreateEnum
CREATE TYPE "Period_type" AS ENUM ('ANNUAL', 'QUARTER');

-- CreateTable
CREATE TABLE "User" (
    "id" BIGSERIAL NOT NULL,
    "type" "User_type" NOT NULL DEFAULT 'NORMAL',
    "name" VARCHAR(255) NOT NULL DEFAULT '',
    "email" VARCHAR(255),
    "investment_type" "InvestmentType",
    "profile_image_url" VARCHAR(2048),
    "current_level" INTEGER,
    "current_step" INTEGER,
    "total_steps" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "education_summary_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" SERIAL NOT NULL,
    "education_level_id" INTEGER NOT NULL,
    "article_id" INTEGER NOT NULL,
    "quiz_type" "Quiz_type" NOT NULL,
    "question" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "option_text" VARCHAR(255)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User_quiz_submission" (
    "user_id" BIGINT NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "selected_answer" TEXT NOT NULL,
    "is_skip" BOOLEAN NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_quiz_submission_pkey" PRIMARY KEY ("user_id","quiz_id")
);

-- CreateTable
CREATE TABLE "Education_summary" (
    "id" SERIAL NOT NULL,
    "stage" INTEGER NOT NULL,
    "label" "EducationSummaryLabel" NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "image_url" TEXT NOT NULL,
    "summary" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Education_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User_education_level_progress" (
    "user_id" BIGINT NOT NULL,
    "education_level_id" INTEGER NOT NULL,
    "is_locked" BOOLEAN NOT NULL,
    "progress_rate" INTEGER NOT NULL,
    "current_step" INTEGER NOT NULL,
    "total_steps" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_education_level_progress_pkey" PRIMARY KEY ("user_id","education_level_id")
);

-- CreateTable
CREATE TABLE "User_article_completion" (
    "user_id" BIGINT NOT NULL,
    "article_id" INTEGER NOT NULL,
    "progress_rate" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_article_completion_pkey" PRIMARY KEY ("user_id","article_id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "user_id" BIGINT NOT NULL,
    "agent_type" "Agent_type" NOT NULL,
    "risk_tolerance" DECIMAL(65,30) NOT NULL,
    "max_position_ratio" DECIMAL(65,30) NOT NULL,
    "cash_reserve_ratio" DECIMAL(65,30) NOT NULL,
    "trade_frequency" "Trade_frequency" NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Agent_stock_sector" (
    "user_id" BIGINT NOT NULL,
    "sector" "Stock_sector" NOT NULL,

    CONSTRAINT "Agent_stock_sector_pkey" PRIMARY KEY ("user_id","sector")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" BIGINT NOT NULL,
    "account_number" VARCHAR(255) NOT NULL,
    "user_id" BIGINT NOT NULL,
    "total_balance" DECIMAL(65,30) NOT NULL,
    "krw_balance" DECIMAL(65,30) NOT NULL,
    "usd_balance" DECIMAL(65,30) NOT NULL,
    "total_available_order_amount" DECIMAL(65,30) NOT NULL,
    "total_investment_amount" DECIMAL(65,30) NOT NULL,
    "domestic_stock_amount" DECIMAL(65,30) NOT NULL,
    "foreign_stock_amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio_transaction" (
    "id" VARCHAR(255) NOT NULL,
    "portfolio_id" BIGINT NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "trade_order_id" BIGINT NOT NULL,
    "executed_at" DATE NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "transaction_type" "Transaction_type" NOT NULL,
    "total_amount" DECIMAL(65,30) NOT NULL,
    "total_quantity" INTEGER NOT NULL,
    "withdrawal_at" DATE NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio_item" (
    "portfolio_id" BIGINT NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "asset_type" VARCHAR(255) NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "company_logo_url" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "average_price" DECIMAL(65,30) NOT NULL,
    "current_price" DECIMAL(65,30) NOT NULL,
    "total_invested" DECIMAL(65,30) NOT NULL,
    "current_amount" DECIMAL(65,30) NOT NULL,
    "evaluation_amount" DECIMAL(65,30) NOT NULL,
    "profit" DECIMAL(65,30) NOT NULL,
    "profit_rate" DECIMAL(65,30) NOT NULL,
    "fee" DECIMAL(65,30) NOT NULL,
    "sale_tax" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_item_pkey" PRIMARY KEY ("portfolio_id","stock_id")
);

-- CreateTable
CREATE TABLE "Dividend_event" (
    "id" VARCHAR(255) NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "record_date" DATE NOT NULL,
    "dividend_ex_date" DATE NOT NULL,
    "amount_per_share" DECIMAL(65,30) NOT NULL,
    "currency_code" "Currency_code" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dividend_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio_dividend" (
    "id" VARCHAR(255) NOT NULL,
    "portfolio_id" BIGINT NOT NULL,
    "dividend_event_id" VARCHAR(255) NOT NULL,
    "portfolio_transaction_id" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dividend_amount" DECIMAL(65,30) NOT NULL,
    "dividend_status" "Dividend_status" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_dividend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "id" INTEGER NOT NULL,
    "ticker" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(255) NOT NULL,
    "sector" "Stock_sector" NOT NULL,
    "risk_level" "Stock_risk_level" NOT NULL,
    "theme" "Stock_theme" NOT NULL,
    "country_code" VARCHAR(255) NOT NULL,
    "currency_code" "Currency_code" NOT NULL,
    "current_price" DECIMAL(65,30) NOT NULL,
    "previous_close" DECIMAL(65,30) NOT NULL,
    "change_amount" DECIMAL(65,30) NOT NULL,
    "change_rate" DECIMAL(65,30) NOT NULL,
    "day_high" DECIMAL(65,30) NOT NULL,
    "day_low" DECIMAL(65,30) NOT NULL,
    "high_52w" DECIMAL(65,30) NOT NULL,
    "low_52w" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "trading_value" DECIMAL(65,30) NOT NULL,
    "market_cap" DECIMAL(65,30) NOT NULL,
    "per" DECIMAL(65,30) NOT NULL,
    "eps" DECIMAL(65,30) NOT NULL,
    "market_status" "Stock_market_status" NOT NULL,
    "debt_ratio" DECIMAL(65,30) NOT NULL,
    "current_ratio" DECIMAL(65,30) NOT NULL,
    "interest_coverage_ratio" DECIMAL(65,30) NOT NULL,
    "announcement_date" DATE NOT NULL,
    "estimated_operating_profit" VARCHAR(255) NOT NULL,
    "estimated_revenue" DECIMAL(65,30) NOT NULL,
    "dividend_count" INTEGER NOT NULL,
    "dividend_per_share" DECIMAL(65,30) NOT NULL,
    "dividend_yield" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock_financial_metric" (
    "id" VARCHAR(255) NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "debt_ratio" DOUBLE PRECISION,
    "current_ratio" DOUBLE PRECISION,
    "interest_coverage_ratio" DOUBLE PRECISION,
    "per" DOUBLE PRECISION,
    "pbr" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_financial_metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock_financial_statement" (
    "id" VARCHAR(255) NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "statement_type" "Statement_type" NOT NULL,
    "period_type" "Period_type" NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "fiscal_quarter" INTEGER,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_financial_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock_earning" (
    "id" VARCHAR(255) NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "announcement_date" TIMESTAMP(3),
    "period_type" "Period_type" NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "fiscal_quarter" INTEGER,
    "estimated_revenue" BIGINT,
    "estimated_operating_profit" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stock_earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade_order" (
    "order_id" BIGINT NOT NULL,
    "portfolio_id" BIGINT NOT NULL,
    "stock_id" INTEGER NOT NULL,
    "ticker" VARCHAR(255) NOT NULL,
    "type" "Trade_order_type" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_share" DECIMAL(65,30) NOT NULL,
    "status" "Trade_order_status" NOT NULL,
    "ordered_at" TIMESTAMP(3) NOT NULL,
    "filled_quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "executed_price" DECIMAL(65,30),
    "executed_at" TIMESTAMP(3),
    "canceled_at" TIMESTAMP(3),
    "reject_reason" VARCHAR(255),
    "currency_code" "Currency_code" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_order_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "Stock_candle" (
    "ticker" VARCHAR(255) NOT NULL,
    "interval_code" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "open_price" DECIMAL(65,30) NOT NULL,
    "high_price" DECIMAL(65,30) NOT NULL,
    "low_price" DECIMAL(65,30) NOT NULL,
    "close_price" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Stock_candle_pkey" PRIMARY KEY ("ticker","interval_code","timestamp")
);

-- CreateTable
CREATE TABLE "Order_book_snapshot" (
    "ticker" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "total_ask_size" DECIMAL(65,30) NOT NULL,
    "total_bid_size" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30) NOT NULL,
    "buy_volume" DECIMAL(65,30) NOT NULL,
    "sell_volume" DECIMAL(65,30) NOT NULL,
    "execution_strength" DECIMAL(65,30) NOT NULL,
    "last_trade_volume" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_book_snapshot_pkey" PRIMARY KEY ("ticker","timestamp")
);

-- CreateTable
CREATE TABLE "Order_book_level" (
    "ticker" VARCHAR(255) NOT NULL,
    "snapshot_timestamp" BIGINT NOT NULL,
    "side" "Order_book_side" NOT NULL,
    "level_rank" INTEGER NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "Order_book_level_pkey" PRIMARY KEY ("ticker","snapshot_timestamp","side","level_rank")
);

-- CreateTable
CREATE TABLE "Market_index" (
    "id" INTEGER NOT NULL,
    "ticker" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "index_type" VARCHAR(255) NOT NULL,
    "current_value" DECIMAL(65,30) NOT NULL,
    "previous_close" DECIMAL(65,30) NOT NULL,
    "change_amount" DECIMAL(65,30) NOT NULL,
    "change_rate" DECIMAL(65,30) NOT NULL,
    "is_realtime" BOOLEAN NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "country_code" VARCHAR(255) NOT NULL,
    "currency_code" "Currency_code" NOT NULL,
    "buy_price" DECIMAL(65,30) NOT NULL,
    "sell_price" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Market_index_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market_index_candle" (
    "ticker" VARCHAR(255) NOT NULL,
    "interval_code" VARCHAR(255) NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "open_value" DECIMAL(65,30) NOT NULL,
    "high_value" DECIMAL(65,30) NOT NULL,
    "low_value" DECIMAL(65,30) NOT NULL,
    "close_value" DECIMAL(65,30) NOT NULL,
    "volume" DECIMAL(65,30),

    CONSTRAINT "Market_index_candle_pkey" PRIMARY KEY ("ticker","interval_code","timestamp")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_hash_key" ON "RefreshToken"("token_hash");

-- CreateIndex
CREATE INDEX "RefreshToken_user_id_idx" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "RefreshToken_expires_at_idx" ON "RefreshToken"("expires_at");

-- CreateIndex
CREATE INDEX "Article_education_summary_id_idx" ON "Article"("education_summary_id");

-- CreateIndex
CREATE INDEX "Quiz_education_level_id_idx" ON "Quiz"("education_level_id");

-- CreateIndex
CREATE INDEX "Quiz_article_id_idx" ON "Quiz"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "Education_summary_stage_key" ON "Education_summary"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_ticker_key" ON "Stock"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_financial_metric_stock_id_key" ON "Stock_financial_metric"("stock_id");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_financial_statement_stock_id_statement_type_period_type_f" ON "Stock_financial_statement"("stock_id", "statement_type", "period_type", "fiscal_year", "fiscal_quarter");

-- CreateIndex
CREATE UNIQUE INDEX "Stock_earning_stock_id_period_type_fiscal_year_fiscal_quarter_k" ON "Stock_earning"("stock_id", "period_type", "fiscal_year", "fiscal_quarter");

-- CreateIndex
CREATE UNIQUE INDEX "Market_index_ticker_key" ON "Market_index"("ticker");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_education_summary_id_fkey" FOREIGN KEY ("education_summary_id") REFERENCES "Education_summary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "Education_summary"("stage") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_quiz_submission" ADD CONSTRAINT "User_quiz_submission_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_education_level_progress" ADD CONSTRAINT "User_education_level_progress_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "Education_summary"("stage") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_article_completion" ADD CONSTRAINT "User_article_completion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User_article_completion" ADD CONSTRAINT "User_article_completion_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent_stock_sector" ADD CONSTRAINT "Agent_stock_sector_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Agent"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_transaction" ADD CONSTRAINT "Portfolio_transaction_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_transaction" ADD CONSTRAINT "Portfolio_transaction_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_transaction" ADD CONSTRAINT "Portfolio_transaction_trade_order_id_fkey" FOREIGN KEY ("trade_order_id") REFERENCES "Trade_order"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_item" ADD CONSTRAINT "Portfolio_item_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_item" ADD CONSTRAINT "Portfolio_item_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dividend_event" ADD CONSTRAINT "Dividend_event_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_dividend" ADD CONSTRAINT "Portfolio_dividend_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_dividend" ADD CONSTRAINT "Portfolio_dividend_dividend_event_id_fkey" FOREIGN KEY ("dividend_event_id") REFERENCES "Dividend_event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio_dividend" ADD CONSTRAINT "Portfolio_dividend_portfolio_transaction_id_fkey" FOREIGN KEY ("portfolio_transaction_id") REFERENCES "Portfolio_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock_financial_metric" ADD CONSTRAINT "Stock_financial_metric_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock_financial_statement" ADD CONSTRAINT "Stock_financial_statement_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock_earning" ADD CONSTRAINT "Stock_earning_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade_order" ADD CONSTRAINT "Trade_order_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "Portfolio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade_order" ADD CONSTRAINT "Trade_order_stock_id_fkey" FOREIGN KEY ("stock_id") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock_candle" ADD CONSTRAINT "Stock_candle_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Stock"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_book_snapshot" ADD CONSTRAINT "Order_book_snapshot_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Stock"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_book_level" ADD CONSTRAINT "Order_book_level_ticker_snapshot_timestamp_fkey" FOREIGN KEY ("ticker", "snapshot_timestamp") REFERENCES "Order_book_snapshot"("ticker", "timestamp") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Market_index_candle" ADD CONSTRAINT "Market_index_candle_ticker_fkey" FOREIGN KEY ("ticker") REFERENCES "Market_index"("ticker") ON DELETE RESTRICT ON UPDATE CASCADE;
