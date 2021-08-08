import { assert } from 'chai';
import { calendarTimeFormat } from '../../../../imports/lib/calendarTimeFormat';

describe('calendarTimeFormat', function () {
  it('formats dates today correctly', function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.equal(calendarTimeFormat(now, now), 'Today at 7:26 PM');
    assert.equal(calendarTimeFormat(new Date(2021, 7, 6, 11, 10), now), 'Today at 11:10 AM');
    assert.equal(calendarTimeFormat(new Date(2021, 7, 6, 22, 50), now), 'Today at 10:50 PM');
  });

  it('formats dates from the last week correctly', function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.equal(calendarTimeFormat(new Date(2021, 7, 4, 10, 5), now), 'Wed 10:05 AM');
  });

  it('formats dates from more than a week ago long-format', function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.equal(calendarTimeFormat(new Date(2021, 6, 20, 15, 25), now), '7/20/2021, 3:25 PM');
    // including the boundary condition, which is a bit odd but ok
    assert.equal(calendarTimeFormat(new Date(2021, 6, 31, 9, 40), now), '7/31/2021, 9:40 AM');
  });

  it('formats future dates in long-format', function () {
    const now = new Date(2021, 7, 6, 19, 26);
    assert.equal(calendarTimeFormat(new Date(2021, 7, 7, 2, 27), now), '8/7/2021, 2:27 AM');
    assert.equal(calendarTimeFormat(new Date(2022, 0, 15, 16, 2), now), '1/15/2022, 4:02 PM');
  });
});
