import EduProgress from "../components/main/edu-progress";
import IndexList from "../components/main/index_list";
import StockList from "../components/main/stock_list";

export default function Home() {
  return (
    <main className="mx-10 py-8">
      <div className="flex items-center justify-center">
        <EduProgress />
        <IndexList />
      </div>

      <StockList />
    </main>
  );
}
