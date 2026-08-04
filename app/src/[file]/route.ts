import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!["app.js", "domain.js", "state.js", "styles.css"].includes(file)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = path.extname(file);
  const body = await readFile(path.join(process.cwd(), "src", file), "utf8");
  return new NextResponse(body, {
    headers: {
      "content-type": CONTENT_TYPES[ext] || "text/plain; charset=utf-8",
    },
  });
}
