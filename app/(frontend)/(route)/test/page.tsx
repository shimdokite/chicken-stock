import InputSample from "../../components/ui/input/sample";
import PopoverSample from "../../components/ui/popover/sample";
import SegmentedControlSample from "../../components/ui/segmented-control/sample";

export default function Test() {
  return (
    <div className="flex w-screen flex-col items-center justify-center gap-10 overflow-auto bg-white text-black">
      <InputSample />
      <PopoverSample />
      <SegmentedControlSample />
    </div>
  );
}
