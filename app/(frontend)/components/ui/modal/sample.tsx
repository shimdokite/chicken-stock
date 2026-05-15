"use client";

import React, { useState } from "react";
import Modal from ".";

export default function ModalSample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex w-fit flex-col gap-4 rounded border p-5">
      <h1>Modal Sample</h1>

      <div className="flex gap-5">
        <Modal.Root isOpen={isOpen} setIsOpen={setIsOpen}>
          <button
            onClick={() => setIsOpen(true)}
            className="h-10 cursor-pointer rounded-md bg-gray-100 px-4 duration-200 hover:bg-gray-200"
          >
            커스텀 버튼
          </button>

          <Modal.Overlay>
            <Modal.Content className="w-[1090px]">
              <div className="">모달의 내용은 컴포넌트로 넣기</div>
            </Modal.Content>
          </Modal.Overlay>
        </Modal.Root>

        <Modal.Root>
          <Modal.Trigger>트리거 버튼</Modal.Trigger>

          <Modal.Overlay>
            <Modal.Content className="w-[1090px]">
              <div className="">모달의 내용은 컴포넌트로 넣기</div>
            </Modal.Content>
          </Modal.Overlay>
        </Modal.Root>
      </div>
    </div>
  );
}
