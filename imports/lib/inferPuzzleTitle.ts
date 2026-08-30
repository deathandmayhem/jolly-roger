/**
 * Given a puzzle page title and URL, infer the puzzle title.
 *
 * Strips out redundant information like hunt titles for known puzzle hunt sites.
 */
export default function inferPuzzleTitle(
  pageTitle: string | undefined | null,
  pageUrl?: string | null,
): string {
  if (!pageTitle) {
    return "";
  }

  const trimmedTitle = pageTitle.trim();
  if (!pageUrl) {
    return trimmedTitle;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    return trimmedTitle;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const pathname = parsedUrl.pathname.toLowerCase();

  if (
    (hostname === "pandamagazine.com" ||
      hostname.endsWith(".pandamagazine.com")) &&
    pathname.includes("island") &&
    trimmedTitle.includes(" | ")
  ) {
    // Puzzle Boats: e.g. "Puzzle Boat X | Puzzle Title" -> "Puzzle Title"
    return trimmedTitle.slice(trimmedTitle.indexOf(" | ") + 3).trim();
  }

  if (
    (hostname === "puzzlehunt.azurewebsites.net" ||
      hostname.endsWith(".puzzlehunt.azurewebsites.net")) &&
    trimmedTitle.includes(" - ")
  ) {
    // Microsoft Puzzle Server: e.g. "Puzzle Title - Microsoft Puzzle Server" -> "Puzzle Title"
    return trimmedTitle.slice(0, trimmedTitle.lastIndexOf(" - ")).trim();
  }

  return trimmedTitle;
}
