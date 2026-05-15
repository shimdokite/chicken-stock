import React from "react";
import Button from ".";
import { IconMinus, IconPlus } from "@tabler/icons-react";

export default function ButtonSample() {
  return (
    <div className="flex w-[600px] flex-col gap-4 rounded border bg-white p-5">
      <h1 className="text-black">Button Sample</h1>

      <div className="flex gap-4">
        <Button variant="buy">구매 예약</Button>
        <Button variant="sell">판매 예약</Button>
        <Button variant="buy">구매</Button>
        <Button variant="sell">판매</Button>
      </div>

      <div className="flex gap-4">
        <Button variant="buy-wide">구매하기</Button>
        <Button variant="sell-wide">판매하기</Button>
      </div>

      <div className="flex gap-4">
        <Button variant="cancel-wide">주문 1건 전체 취소</Button>
        <Button variant="cancel-wide" disabled>
          주문 1건 전체 취소
        </Button>
      </div>

      <div className="flex gap-4">
        <Button variant="portfolio-wide">포트폴리오 보기</Button>
      </div>

      <div className="flex gap-4">
        <Button variant="buy-subtle">현재가 구매</Button>
        <Button variant="sell-subtle">현재가 판매</Button>
        <Button variant="buy-subtle" disabled>
          시장가 구매
        </Button>
        <Button variant="sell-subtle" disabled>
          시장가 판매
        </Button>
      </div>

      <div className="flex gap-4">
        <Button variant="stock-count">1주</Button>
        <Button variant="percentage">10%</Button>
        <div className="flex">
          <Button variant="quantity-left">
            <IconMinus stroke={2} size={14} />
          </Button>
          <Button variant="quantity-right">
            <IconPlus stroke={2} size={14} />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <Button variant="step-controls">다음</Button>
        <Button variant="step-controls">이전</Button>
        <Button variant="step-controls">취소</Button>
      </div>
    </div>
  );
}
