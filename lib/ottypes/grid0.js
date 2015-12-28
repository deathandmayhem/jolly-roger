// An OT type for 2D grids, like spreadsheets
//
// The underlying data store for a grid is a 2-D
// spreadsheet. Operations are normalized to a list of components, of
// which the following are supported:
//
// - {s: [[rowidx, colidx, oldval, newval], ...]}: For each element of
//   `s`, set the cell at `[rowidx, colidx]` from `old` to `new`. This
//   is mainly a list so that we can compose them more easily.
//
// - {ir: idx, c: count}: Insert `count` empty rows before index `idx`
//
// - {ic: idx, c: count}: Insert `count` empty columns before index
//   `idx`
//
// - {dr: idx, c: count, data: [[]]}: Delete `count` rows with
//   contents `data` starting at index `idx` (`data` is needed for
//   invertability)
//
// - {dc: idx, c: count, data: [[]]}: Delete `count` columns with
//   contents `data` starting at index `idx`. `data` is needed for
//   invertability, and should be column oriented (i.e. data[0] should
//   be the first column)

const clone = function(o) {
  return JSON.parse(JSON.stringify(o));
};

const grid = {
  name: 'grid0',
  uri: 'http://github.com/ebroder/jolly-roger/types/grid0',

  // Since this will primarily be used with subtypes, it doesn't
  // matter too much
  create(data) {
    return data === undefined ? [] : clone(data);
  },

  normalize(op) {
    return _.isArray(op) ? op : [op];
  },

  append(dest, op) {
    if (dest.length === 0) {
      dest.push(op);
      return dest;
    }

    const last = dest[dest.length - 1];

    // TODO: Try to do some more coalescing here. It doesn't change
    // correctness but does improve efficiency
    if (_.has(last, 's') && _.has(op, 's')) {
      last.s = last.s.concat(op.s);
    } else {
      dest.push(op);
    }

    return dest;
  },

  compose(ops1, ops2) {
    return _.reduce(ops2, grid.append, clone(ops1));
  },

  // Invert an entire op (list of components). We can't do this 1
  // component at a time, because dc and dr require two ops to invert
  invert(ops) {
    const inverse = [];

    _.each(ops, (op) => {
      if (_.has(op, 's')) {
        inverse.push({s: _.map(op.s, ([r, c, o, n]) => [r, c, n, o])});
      } else if (_.has(op, 'ir')) {
        inverse.push({dr: op.ir, c: op.c});
      } else if (_.has(op, 'ic')) {
        inverse.push({dc: op.ic, c: op.c});
      } else if (_.has(op, 'dr')) {
        inverse.push({ir: op.dr, c: op.c});
        sets = [];
        for (let i = 0; i < op.c; i++) {
          for (let k = 0; k < op.data[i].length; k++) {
            sets.push([op.dr + i, k, null, op.data[i][k]]);
          }
        }

        inverse.push({s: sets});
      } else if (_.has(op, 'dc')) {
        inverse.push({ic: op.dc, c: op.c});
        sets = [];
        for (let i = 0; i < op.c; i++) {
          for (let k = 0; k < op.data[i].length; k++) {
            sets.push([k, op.dc + i, null, op.data[i][k]]);
          }
        }

        inverse.push({s: sets});
      }
    });

    return inverse;
  },

  applyComponent(snapshot, op) {
    if (_.has(op, 's')) {
      _.each(op.s, ([r, c, o, n]) => {
        if (snapshot[r] === undefined || snapshot[r][c] !== o) {
          throw new Error(`Operation does not apply: element (${r}, ${c}) should be ${o}`);
        }

        snapshot[r][c] = n;
      });
    } else if (_.has(op, 'ir')) {
      const maxCols = _.chain(snapshot).
        map((row) => row.length).
        max().
        value();
      const newRows = Array(op.c).fill(null).map(() => Array(maxCols).fill(null));
      snapshot.splice(op.ir, 0, ...newRows);
    } else if (_.has(op, 'ic')) {
      _.each(snapshot, (row) => {
        if (row.length > op.ic) {
          row.splice(op.ic, 0, ...Array(op.c).fill(null));
        }
      });
    } else if (_.has(op, 'dr')) {
      snapshot.splice(op.dr, op.c);
    } else if (_.has(op, 'dc')) {
      _.each(snapshot, (row) => {
        if (row.length > op.dc) {
          row.splice(op.dc, op.c);
        }
      });
    } else {
      throw new Error(`Unknown operation: ${op}`);
    }

    return snapshot;
  },

  apply(snapshot, ops) {
    return _.reduce(ops, grid.applyComponent, snapshot);
  },

  // transform is confusing because there are two orders: the semantic
  // order of operations that the server maintains, and the actual
  // order that the operations are applied to the data.
  //
  // In the actual order, `op` is always being applied after `other`,
  // but which comes first in the semantic order probably won't change
  // how this op should be applied, unless the two ops directly
  // conflict (e.g. modify the same cell). In that case, `type`
  // indicates the semantic order: "left" indicates that `op`
  // _should_ have been applied after `other`
  //
  // A quick summary of how ops need to be transformed:
  //
  // - s ops when transformed across other s ops need to either update
  //   the old value or drop the op, depending on type.
  //
  // - s ops when transformed across all other ops just need to update
  //   their coordinates
  //
  // - insert ops when transformed across s ops or ops in the opposite
  //   direction have no effect
  //
  // - insert ops when transformed across other insert and deletions
  //   of the same dimention adjust the dimensions, if the ther
  //   operation happens below/left of the op being transformed
  transformComponent(dest, op, other, type) {
    if (!(type === 'left' || type === 'right')) {
      throw new Error("type must be 'left' or 'right'");
    }

    if (_.has(op, 's')) {
      if (_.has(other, 's')) {
        const othercells = {};
        _.each(other.s, ([r, c, o, n]) => othercells[`${r}:${c}`] = n);

        if (type === 'left') {
          // identify all the cells in other.s and update the old
          // value in op using the new value in other
          dest.push({
            s: _.map(op.s, ([r, c, o, n]) => {
              if (_.has(othercells, `${r}:${c}`)) {
                o = othercells[`${r}:${c}`];
              }

              return [r, c, o, n];
            }),
          });
        } else {
          // identify all cells in other.s and remove them from op
          dest.push({
            s: _.reject(op.s, ([r, c]) => _.has(othercells, `${r}:${c}`)),
          });
        }
      } else if (_.has(other, 'ir')) {
        // increment row by other.c on all cells with row >= other.ir
        dest.push({
          s: _.map(op.s, ([r, c, o, n]) => {
            if (r >= other.ir) {
              r += other.c;
            }

            return [r, c, o, n];
          }),
        });
      } else if (_.has(other, 'ic')) {
        // increment col by other.c on all cells with col >= other.ic
        dest.push({
          s: _.map(op.s, ([r, c, o, n]) => {
            if (c >= other.ic) {
              c += other.c;
            }

            return [r, c, o, n];
          }),
        });
      } else if (_.has(other, 'dr')) {
        // decrement row by other.c on all cells with row >= other.ir
        // + other.c; delete all cells with other.ir <= row < other.ir
        // + other.c
        dest.push({
          s: _.chain(op.s).
            map(([r, c, o, n]) => {
              if (other.ir <= r && r < other.ir + other.c) {
                return null;
              } else if (other.ir + other.c <= r) {
                r -= other.c;
              }

              return [r, c, o, n];
            }).
            compact().
            value(),
        });
      } else if (_.has(other, 'dc')) {
        // decrement col by other.c on all cells with col >= other.ic
        // + other.c; delete all cells with other.ic <= col < other.ic
        // + other.c
        dest.push({
          s: _.chain(op.s).
            map(([r, c, o, n]) => {
              if (other.ic <= c && c < other.ic + other.c) {
                return null;
              } else if (other.ic + other.c <= c) {
                c -= other.c;
              }

              return [r, c, o, n];
            }).
            compact().
            value(),
        });
      }
    } else if (_.has(op, 'ir')) {
      if (_.has(other, 'ir')) {
        if (other.ir + other.c < op.ir) {
          dest.push({ir: op.ir + other.c, c: op.c});
        } else {
          dest.push(op);
        }
      } else if (_.has(other, 'dr')) {
        if (other.dr + other.c < op.ir) {
          dest.push({ir: op.ir - other.c, c: op.c});
        } else {
          dest.push(op);
        }
      } else {
        dest.push(op);
      }
    } else if (_.has(op, 'ic')) {
      if (_.has(other, 'ic')) {
        if (other.ic + other.c < op.ic) {
          dest.push({ic: op.ic + other.c, c: op.c});
        } else {
          dest.push(op);
        }
      } else if (_.has(other, 'dc')) {
        if (other.dc + other.c < op.ic) {
          dest.push({ic: op.ic - other.c, c: op.c});
        } else {
          dest.push(op);
        }
      } else {
        dest.push(op);
      }
    } else if (_.has(op, 'dr')) {
    } else if (_.has(op, 'dc')) {
    }

    return dest;
  },
};
OTTypes.buildFromComponents(grid, grid.transformComponent, grid.append);
OTTypes.grid0 = grid;

const types = (ShareJS.types || ShareJS);
types.registerType(grid);
types.ottypes.json0.registerSubtype(grid);
if (ShareJS.db) {
  ShareJS.db.ot.registerType(grid);
}
