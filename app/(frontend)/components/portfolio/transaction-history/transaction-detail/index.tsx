import type {
  PortfolioItem,
  PortfolioTransaction,
} from "@/app/(frontend)/apis/portfolio/api";
import {
  formatTransactionAmount,
  getLogoText,
  getTransactionDetailRows,
} from "../utils";

interface TransactionDetailProps {
  item?: PortfolioItem;
  transaction: PortfolioTransaction;
}

export default function TransactionDetail({
  item,
  transaction,
}: TransactionDetailProps) {
  const detailRows = getTransactionDetailRows(transaction);

  return (
    <div className="col gap-7">
      <div className="row items-start justify-between gap-6">
        <div className="col gap-1">
          <p className="text-base">{transaction.companyName}</p>
          <p className="text-2xl">{formatTransactionAmount(transaction)}</p>
        </div>

        <div className="row center h-20 w-20 shrink-0 bg-[#1628a0] px-2 text-center text-xs font-bold text-white">
          {getLogoText(item, transaction.companyName)}
        </div>
      </div>

      <dl className="col gap-8 text-base">
        {detailRows.map((row) => (
          <div key={row.label} className="grid grid-cols-[9rem_minmax(0,1fr)]">
            <dt>{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
