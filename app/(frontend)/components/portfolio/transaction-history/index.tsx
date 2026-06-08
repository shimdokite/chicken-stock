import { useState } from "react";
import { useGetPortfolio } from "@/app/(frontend)/apis/portfolio/queries";
import CurrencyFilter from "./currency-filter";
import TransactionDetail from "./transaction-detail";
import TransactionFilter from "./transaction-filter";
import TransactionList from "./transaction-list";
import { getFilteredTransactions } from "./utils";
import {
  TransactionCurrency,
  TransactionHistoryFilter,
} from "@/app/(frontend)/types/portfolio";

export default function TransactionHistory() {
  const { data } = useGetPortfolio();
  const [selectedCurrency, setSelectedCurrency] =
    useState<TransactionCurrency>("원화");
  const [selectedFilter, setSelectedFilter] =
    useState<TransactionHistoryFilter>("전체");
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);

  if (!data) {
    return null;
  }

  const transactions = getFilteredTransactions(
    data.transactions,
    selectedFilter,
  );
  const selectedTransaction =
    transactions.find(
      (transaction) => transaction.id === selectedTransactionId,
    ) ??
    transactions[0] ??
    null;
  const itemByStockId = new Map(
    data.items.map((item) => [item.stockId, item] as const),
  );
  const selectedItem =
    selectedTransaction?.stockId === null || !selectedTransaction
      ? undefined
      : itemByStockId.get(selectedTransaction.stockId);

  return (
    <div className="col min-h-0 flex-1 gap-10 overflow-hidden pt-8">
      <CurrencyFilter
        krwBalance={data.krwBalance}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        usdBalance={data.usdBalance}
      />

      <section className="grid min-h-0 flex-1 grid-cols-1 grid-rows-2 gap-6 overflow-hidden p-4 xl:grid-cols-2 xl:grid-rows-1">
        <div className="col min-h-0 overflow-hidden rounded-lg px-8 py-9 shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
          <TransactionFilter
            selectedFilter={selectedFilter}
            setSelectedFilter={(filter) => {
              setSelectedFilter(filter);
              setSelectedTransactionId(null);
            }}
          />

          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            <TransactionList
              selectedTransactionId={selectedTransaction?.id ?? null}
              setSelectedTransactionId={setSelectedTransactionId}
              transactions={transactions}
            />
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto rounded-lg px-10 py-9 shadow-[3px_6px_10px_rgba(0,0,0,0.25)]">
          {selectedTransaction && (
            <TransactionDetail
              item={selectedItem}
              transaction={selectedTransaction}
            />
          )}

          {!selectedTransaction && (
            <div className="row center h-full text-lg text-[#777777]">
              거래를 선택해 주세요.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
