// Bind a Handsontable instance to ShareJS
//
// This turns out to be a bit awkward, since both Handsontable and
// ShareJS want to be the ultimate owners of the data in question, and
// we don't really want to spend our time shoveling data back and forth.
//
// To support this, we catch a bunch of changes that Handsontable
// would otherwise make directly, and submit them ourselves to ShareJS

Spreadsheet = React.createClass({
  componentDidMount() {
    this.sharejs = new ShareJS.Connection(new ShareJSSocket());
    const doc = this.sharejs.get('docs', this.props.id || this.props.params.id);
    doc.subscribe();
    doc.whenReady(() => {
      // Forcefully migrate from old format
      if (doc.type && !doc.getSnapshot().data) {
        doc.del();
      }

      if (!doc.type) {
        doc.create('json0', {
          rows: 4,
          cols: 5,
          data: [
            ['', '', '', '', ''],
            ['', '', '', '', ''],
            ['', '', '', '', ''],
            ['', '', '', '', ''],
          ],
        });
      }

      const snap = doc.getSnapshot();
      const ctx = doc.createContext();

      this.hot = new Handsontable(this.refs.editor, {
        rowHeaders: true,
        manualRowResize: true,
        manualRowMove: true,
        colHeaders: true,
        manualColumnResize: true,
        manualColumnMove: true,
        contextMenu: true,
        columnSorting: true,
        sortIndicator: true,
        data: snap.data,

        beforeChange: (changes) => {
          changes.forEach(([r, c, last, cur]) => {
            ctx.submitOp({p: ['data', r, c], ld: last, li: cur});
          });

          // Don't actually apply the modifications, since ShareJS will do it for us
          return false;
        },
      });

      // This is super gross. We don't want Handsontable to apply the
      // insert/delete column/row actions directly to the data source (we
      // want ShareJS to do that), so we Monkeypatch alter so that we can
      // send those operations to ShareJS
      const _origAlter = this.hot.alter;
      this.hot.alter = function(action, index, amount, source, keepEmptyRows) {
        if (amount === undefined) {
          amount = 1;
        }

        switch (action) {
          case 'insert_row':
            ctx.submitOp({p: ['rows'], na: amount});
            while (amount-- > 0) {
              ctx.submitOp({p: ['data', index], li: _.range(snap.cols).fill('')});
            }

            break;
          case 'insert_col':
            break;
          case 'remove_row':
            ctx.submitOp({p: ['rows'], na: -amount});
            while (amount-- > 0) {
              ctx.submitOp({p: ['data', index], ld: snap.data[index]});
            }

            break;
          case 'remove_col':
            break;
          default:
            throw new Error('There is no such action "' + action + '"');
        }
      };

      // Trigger a re-render whenever an op comes in.
      ctx._onOp = () => this.hot.render();
    });
  },

  componentWillUnmount() {
    if (this.sharejs) {
      this.sharejs.disconnect();
      delete this.sharejs;
      delete this.hot;
    }
  },

  render() {
    return <div ref="editor">Loading...</div>;
  },
});
