import Avatar from ".";

export default function AvatarSample() {
  return (
    <div className="flex w-fit flex-col gap-4 rounded border p-5">
      <h1>Avatar Sample</h1>

      <div className="flex gap-5">
        <Avatar src="/test-image.png" type="header" />
        <Avatar src="/test-image.png" type="main" />
        <Avatar src="/test-image.png" type="portfolio-mini-circle" />
        <Avatar src="/test-image.png" type="portfolio-mini-square" />
        <Avatar src="/test-image.png" type="stock-detail" />
        <Avatar src="/test-image.png" type="mypage" />
      </div>
    </div>
  );
}
