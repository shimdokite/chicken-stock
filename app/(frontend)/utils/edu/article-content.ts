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
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | {
      type: "divider";
    };

export function formatInlineText(text: string) {
  return text.replace(/\*\*/g, "");
}

function parseTableRow(line: string) {
  const trimmedLine = line.trim();
  const rowContent = trimmedLine.replace(/^\|/, "").replace(/\|$/, "").trim();

  return rowContent.split("|").map((cell) => formatInlineText(cell.trim()));
}

function isTableDivider(line: string, expectedColumnCount: number) {
  const cells = parseTableRow(line);

  return (
    cells.length === expectedColumnCount &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  );
}

function normalizeTableRow(cells: string[], columnCount: number) {
  return Array.from({ length: columnCount }, (_, index) => cells[index] ?? "");
}

export function parseArticleContent(content: string) {
  const blocks: ArticleContentBlock[] = [];
  const listItems: string[] = [];
  const lines = content.split(/\r?\n/);

  function flushListItems() {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({ type: "list", items: [...listItems] });
    listItems.length = 0;
  }

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushListItems();
      continue;
    }

    if (trimmedLine.startsWith("- ")) {
      listItems.push(formatInlineText(trimmedLine.slice(2)));
      continue;
    }

    flushListItems();

    const tableHeaders = trimmedLine.includes("|")
      ? parseTableRow(trimmedLine)
      : [];
    const nextLine = lines[lineIndex + 1]?.trim() ?? "";

    if (
      tableHeaders.length > 0 &&
      nextLine &&
      isTableDivider(nextLine, tableHeaders.length)
    ) {
      const rows: string[][] = [];
      lineIndex += 2;

      while (lineIndex < lines.length) {
        const tableRowLine = lines[lineIndex].trim();

        if (!tableRowLine || !tableRowLine.includes("|")) {
          lineIndex -= 1;
          break;
        }

        rows.push(
          normalizeTableRow(parseTableRow(tableRowLine), tableHeaders.length),
        );
        lineIndex += 1;
      }

      blocks.push({
        type: "table",
        headers: tableHeaders,
        rows,
      });
      continue;
    }

    if (trimmedLine === "---") {
      blocks.push({ type: "divider" });
      continue;
    }

    if (trimmedLine.startsWith("### ")) {
      blocks.push({
        type: "heading",
        level: 3,
        text: formatInlineText(trimmedLine.slice(4)),
      });
      continue;
    }

    if (trimmedLine.startsWith("## ")) {
      blocks.push({
        type: "heading",
        level: 2,
        text: formatInlineText(trimmedLine.slice(3)),
      });
      continue;
    }

    if (trimmedLine.startsWith("# ")) {
      blocks.push({
        type: "heading",
        level: 1,
        text: formatInlineText(trimmedLine.slice(2)),
      });
      continue;
    }

    if (trimmedLine.startsWith("> ")) {
      blocks.push({
        type: "quote",
        text: formatInlineText(trimmedLine.slice(2)),
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      text: formatInlineText(trimmedLine),
    });
  }

  flushListItems();

  return blocks;
}
