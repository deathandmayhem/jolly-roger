import { onPageLoad } from "meteor/server-render";

import lookupUrl from "./lookupUrl";

onPageLoad((sink) => {
  if (sink.appendToHead) {
    const appleTouchIconSrc = lookupUrl("apple-touch-icon.png");
    const favicon32Src = lookupUrl("favicon-32x32.png");
    const favicon16Src = lookupUrl("favicon-16x16.png");
    const safariPinnedTabSrc = lookupUrl("safari-pinned-tab.svg");

    sink.appendToHead(
      '  <meta charset="utf-8">\n' +
        '  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
        '  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
        `  <link rel="apple-touch-icon" sizes="180x180" href="${appleTouchIconSrc}">\n` +
        `  <link rel="icon" type="image/png" sizes="32x32" href="${favicon32Src}">\n` +
        `  <link rel="icon" type="image/png" sizes="16x16" href="${favicon16Src}">\n` +
        '  <link rel="manifest" href="/site.webmanifest">\n' +
        `  <link rel="mask-icon" href="${safariPinnedTabSrc}" color="#5bbad5">\n` +
        '  <meta name="msapplication-config" content="/browserconfig.xml">\n' +
        '  <meta name="msapplication-TileColor" content="#000000">\n' +
        '  <meta name="theme-color" content="#ffffff">\n' +
        "  <title>Jolly Roger</title>\n",
    );
  }
});
