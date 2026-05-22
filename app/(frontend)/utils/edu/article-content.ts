export type ArticleContentBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3;
      text: string;
    }
  | {
      type: "paragraph" | "quote";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "divider";
    };

export function formatInlineText(text: string) {
  return text.replace(/\*\*/g, "");
}

export function parseArticleContent(content: string) {
  const blocks: ArticleContentBlock[] = [];
  const listItems: string[] = [];

  function flushListItems() {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({ type: "list", items: [...listItems] });
    listItems.length = 0;
  }

  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushListItems();
      return;
    }

    if (trimmedLine.startsWith("- ")) {
      listItems.push(formatInlineText(trimmedLine.slice(2)));
      return;
    }

    flushListItems();

    if (trimmedLine === "---") {
      blocks.push({ type: "divider" });
      return;
    }

    if (trimmedLine.startsWith("### ")) {
      blocks.push({
        type: "heading",
        level: 3,
        text: formatInlineText(trimmedLine.slice(4)),
      });
      return;
    }

    if (trimmedLine.startsWith("## ")) {
      blocks.push({
        type: "heading",
        level: 2,
        text: formatInlineText(trimmedLine.slice(3)),
      });
      return;
    }

    if (trimmedLine.startsWith("# ")) {
      blocks.push({
        type: "heading",
        level: 1,
        text: formatInlineText(trimmedLine.slice(2)),
      });
      return;
    }

    if (trimmedLine.startsWith("> ")) {
      blocks.push({
        type: "quote",
        text: formatInlineText(trimmedLine.slice(2)),
      });
      return;
    }

    blocks.push({
      type: "paragraph",
      text: formatInlineText(trimmedLine),
    });
  });

  flushListItems();

  return blocks;
}
