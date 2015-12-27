// Bind a Handsontable instance to ShareJS
//
// This turns out to be a bit awkward, since both Handsontable and
// ShareJS want to be the ultimate owners of the data in question, and
// we don't really want to spend our time shoveling data back and forth.
//
// Fortunately, in most cases, we can catch changes in Handsontable
// before it applies them and cancel the update, submit it to ShareJS,
// and let it bubble back to Handsontable from there.

Spreadsheet = React.createClass({
  componentDidMount() {
    this.sharejs = new ShareJS.Connection(new ShareJSSocket());
    const doc = this.sharejs.get('docs', this.props.id || this.props.params.id);
    doc.subscribe();
    doc.whenReady(() => {
      if (!doc.type) {
        doc.create('json0', {rows: [
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', ''],
        ],
        });
      }

      ctx = doc.createContext();
      ctx._onOp = () => $(this.refs.editor).handsontable('render');

      $(this.refs.editor).handsontable({
        rowHeaders: true,
        manualRowResize: true,
        manualRowMove: true,
        colHeaders: true,
        manualColumnResize: true,
        manualColumnMove: true,
        contextMenu: true,
        columnSorting: true,
        sortIndicator: true,
        data: doc.getSnapshot().rows,

        beforeChange: (changes) => {
          changes.forEach(([r, c, last, cur]) => {
            ctx.submitOp({p: ['rows', r, c], ld: last, li: cur});
          });
          return false;
        },
      });
    });
  },

  componentWillUnmount() {
    if (this.sharejs) {
      this.sharejs.disconnect();
      this.sharejs = null;
    }
  },

  render() {
    return <div ref="editor">Loading...</div>;
  },
});
