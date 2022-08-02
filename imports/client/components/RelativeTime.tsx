import { Meteor } from 'meteor/meteor';
import React, { useEffect, useState } from 'react';
import { complete, RelativeTimeFormatOpts } from '../../lib/relativeTimeFormat';

const RelativeTime = ({
  date, minimumUnit, maxElements, terse, now,
}: {
  date: Date,
} & RelativeTimeFormatOpts) => {
  const [formatted, setFormatted] = useState(complete(date, {
    minimumUnit, maxElements, terse, now,
  }));

  useEffect(() => {
    const timeout = Meteor.setTimeout(() => {
      setFormatted(complete(date, {
        minimumUnit, maxElements, terse, now,
      }));
    }, formatted.millisUntilChange);

    return () => {
      Meteor.clearTimeout(timeout);
    };
  }, [
    date,
    formatted.millisUntilChange,
    maxElements,
    minimumUnit,
    now,
    terse,
    // Note that we explicitly include formatted.formatted here so that we set a
    // new timeout if the formatted string changes but (by change) the
    // millisUntilChange does not.
    formatted.formatted,
  ]);

  return <span>{formatted.formatted}</span>;
};

export default RelativeTime;
