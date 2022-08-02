import { assert } from 'chai';
import relativeTimeFormat from '../../../../imports/lib/relativeTimeFormat';

describe('relativeTimeFormat', function () {
  it('formats correctly with single item', function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 55, 9)), { now }), '1 second ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 55, 8)), { now }), '2 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 54, 11)), { now }), '59 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 54, 10)), { now }), '1 minute ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 40)), { now }), '1 minute ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 10)), { now }), '2 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 11)), { now }), '59 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 10)), { now }), '1 hour ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 25, 10)), { now }), '1 hour ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 19, 55, 10)), { now }), '2 hours ago');
  });

  it('formats correctly with multiple items', function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 55, 9)), { maxElements: -1, now }), '1 second ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 55, 8)), { maxElements: -1, now }), '2 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 54, 11)), { maxElements: -1, now }), '59 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 54, 10)), { maxElements: -1, now }), '1 minute ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 40)), { maxElements: -1, now }), '1 minute, 30 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 10)), { maxElements: -1, now }), '2 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 11)), { maxElements: -1, now }), '59 minutes, 59 seconds ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 10)), { maxElements: -1, now }), '1 hour ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 25, 10)), { maxElements: -1, now }), '1 hour, 30 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 19, 55, 10)), { maxElements: -1, now }), '2 hours ago');

    assert.equal(relativeTimeFormat(new Date(Date.UTC(2020, 7, 1, 18, 20, 40)), { maxElements: -1, now }), '1 year, 193 days, 3 hours, 34 minutes, 30 seconds ago');
  });

  it('formats correctly with a minimum unit', function () {
    const now = new Date(Date.UTC(2022, 1, 10, 21, 55, 10));
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 40)), { maxElements: -1, minimumUnit: 'minute', now }), '1 minute ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 21, 53, 10)), { maxElements: -1, minimumUnit: 'minute', now }), '2 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 11)), { maxElements: -1, minimumUnit: 'minute', now }), '59 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 55, 10)), { maxElements: -1, minimumUnit: 'minute', now }), '1 hour ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 20, 25, 10)), { maxElements: -1, minimumUnit: 'minute', now }), '1 hour, 30 minutes ago');
    assert.equal(relativeTimeFormat(new Date(Date.UTC(2022, 1, 10, 19, 55, 10)), { maxElements: -1, minimumUnit: 'minute', now }), '2 hours ago');

    assert.equal(relativeTimeFormat(new Date(Date.UTC(2020, 7, 1, 18, 20, 40)), { maxElements: -1, minimumUnit: 'day', now }), '1 year, 193 days ago');
  });
});
