import type {
  StockCurrencyCode,
  StockDetailData,
  StockOrderBookLevelData,
  StockOrderBookSnapshotData,
} from "../../../../types/stock/stock-detail";

export type OrderBookPanelProps = {
  stock: StockDetailData;
  sourceCurrencyCode: StockCurrencyCode;
  initialOrderBookSnapshot: StockOrderBookSnapshotData | null;
  selectedPrice: number | null;
  onPriceSelect: (price: number) => void;
};

export type OrderBookLevelRow = StockOrderBookLevelData | null;
