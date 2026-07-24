import MyInfo from "../../components/my/my-info";
import FeesBenefits from "../../components/my/fees-benefits";
import DeleteAccount from "../../components/my/delete-account";

export default function MyPage() {
  return (
    <main className="py-8 md:py-12">
      <div className="cs-page-shell">
        <div className="col mx-auto w-full max-w-[1000px] gap-5">
          <MyInfo />
          <FeesBenefits />
          <DeleteAccount />
        </div>
      </div>
    </main>
  );
}
