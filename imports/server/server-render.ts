import { onPageLoad } from 'meteor/server-render';

onPageLoad((sink) => {
  if (sink.appendToHead) {
    sink.appendToHead(
      '  <meta charset="utf-8">\n' +
      '  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '  <link rel="apple-touch-icon" sizes="180x180" href="/asset/apple-touch-icon.png">\n' +
      '  <link rel="icon" type="image/png" sizes="32x32" href="/asset/favicon-32x32.png">\n' +
      '  <link rel="icon" type="image/png" sizes="16x16" href="/asset/favicon-16x16.png">\n' +
      '  <link rel="manifest" href="/site.webmanifest">\n' +
      '  <link rel="mask-icon" href="/asset/safari-pinned-tab.svg" color="#5bbad5">\n' +
      '  <meta name="msapplication-TileColor" content="#000000">\n' +
      '  <meta name="theme-color" content="#ffffff">\n' +
      '  <title>Jolly Roger</title>\n'
    );
  }
});
