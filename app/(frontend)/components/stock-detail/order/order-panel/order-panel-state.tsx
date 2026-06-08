export default function OrderPanelState({ message }: { message: string }) {
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-5 pb-5 text-center text-base font-semibold text-zinc-500">
      {message}
    </div>
  );
}
