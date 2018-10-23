import { onPageLoad } from 'meteor/server-render';

onPageLoad((sink) => {
  sink.appendToHead(
    '  <meta charset="utf-8">\n' +
    '  <meta http-equiv="X-UA-Compatible" content="IE=edge">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
    '  <title>Jolly Roger</title>\n'
  );
});
