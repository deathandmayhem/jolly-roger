// This runs in Google's Apps Script environment, and is thus only sort of
// JavaScript.

/* global ContentService, SpreadsheetApp, Utilities */

const SHARED_SECRET = "{{secret}}";

// This regex (and the parsing logic below) taken from
// https://github.com/killmenot/valid-data-url and
// https://github.com/killmenot/parse-data-url
const dataUrlRegex =
  /^data:([a-z]+\/[a-z0-9-+.]+(;[a-z0-9-.!#$%*+.{}|~`]+=[a-z0-9-.!#$%*+.{}()_|~`]+)*)?(;base64)?,([a-z0-9!$&',()*+;=\-._~:@/?%\s<>]*?)$/i;

const METHODS = {
  ping() {
    return ContentService.createTextOutput(JSON.stringify({ ok: true }));
  },

  listSheets(params) {
    const spreadsheetId = params.spreadsheet;
    if (!spreadsheetId) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "No spreadsheet provided" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Invalid spreadsheet ID" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const sheets = spreadsheet.getSheets().map((sheet) => {
      return { name: sheet.getName(), id: sheet.getSheetId() };
    });
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, sheets }),
    ).setMimeType(ContentService.MimeType.JSON);
  },

  insertImage(params) {
    const spreadsheetId = params.spreadsheet;
    if (!spreadsheetId) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "No spreadsheet provided" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Invalid spreadsheet ID" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const sheetId = parseInt(params.sheet, 10);
    if (Number.isNaN(sheetId)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Invalid sheet ID" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }
    const sheet = spreadsheet.getSheets().find((s) => {
      return s.getSheetId() === sheetId;
    });
    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Invalid sheet ID" }),
      ).setMimeType(ContentService.MimeType.JSON);
    }

    switch (params.source) {
      case "upload": {
        const filename = params["upload-filename"];
        if (!filename) {
          return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: "No file name" }),
          ).setMimeType(ContentService.MimeType.JSON);
        }
        const contents = params["upload-contents"];
        if (!contents) {
          return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: "No file contents" }),
          ).setMimeType(ContentService.MimeType.JSON);
        }

        const parts = contents.trim().match(dataUrlRegex);
        if (!parts) {
          return ContentService.createTextOutput(
            JSON.stringify({
              ok: false,
              error: "File contents does not match data URL format",
            }),
          ).setMimeType(ContentService.MimeType.JSON);
        }

        const mediaType = parts[1];
        if (!mediaType) {
          return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: "No media type" }),
          ).setMimeType(ContentService.MimeType.JSON);
        }

        const mediaTypeParts = mediaType.split(";").map((x) => x.toLowerCase());
        const contentType = mediaTypeParts[0];

        const base64 = !!parts[parts.length - 2];
        const data = parts[parts.length - 1] || "";

        const blob = Utilities.newBlob(
          base64 ? Utilities.base64Decode(data) : data,
          contentType,
          filename,
        );

        sheet.insertImage(blob, 2, 2);

        break;
      }
      case "link": {
        const link = params.link;
        if (!link) {
          return ContentService.createTextOutput(
            JSON.stringify({ ok: false, error: "No link provided" }),
          ).setMimeType(ContentService.MimeType.JSON);
        }

        sheet.insertImage(link, 2, 2);

        break;
      }
      default:
        return ContentService.createTextOutput(
          JSON.stringify({ ok: false, error: "Invalid source" }),
        ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true }),
    ).setMimeType(ContentService.MimeType.JSON);
  },
};

// biome-ignore lint/correctness/noUnusedVariables: This is part of the Apps Script API
function doPost(e) {
  if (e.postData?.type !== "application/json") {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "POST submission must be JSON" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  let parameters;
  try {
    parameters = JSON.parse(e.postData.contents);
  } catch {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Invalid JSON" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const secret = parameters.secret;
  if (secret !== SHARED_SECRET) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Invalid secret" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const method = parameters.method;
  if (!(method in METHODS)) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Invalid method" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return METHODS[method](parameters.parameters);
}
