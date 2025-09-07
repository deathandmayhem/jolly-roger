import { Meteor } from "meteor/meteor";
import React, { useEffect, useState } from "react";
import type { RelativeTimeFormatOpts } from "../../lib/relativeTimeFormat";
import { complete } from "../../lib/relativeTimeFormat";

const RelativeTime = ({
  date,
  minimumUnit,
  maxElements,
  terse,
  now,
}: {
  date: Date;
} & RelativeTimeFormatOpts) => {
  const [formatted, setFormatted] = useState(
    complete(date, {
      minimumUnit,
      maxElements,
      terse,
      now,
    }),
  );

  useEffect(() => {
    // We need to compute formatted eagerly here, so that we update
    // promptly if props (especially `date`) change -- otherwise we'd wait
    // until formatted.millisUntilChange have passed before updating.
    const initial = complete(date, {
      minimumUnit,
      maxElements,
      terse,
      now,
    });
    setFormatted(initial);
  }, [date, maxElements, minimumUnit, now, terse]);

  useEffect(() => {
    // Set up reevaluation when we'd expect the string to change
    const timeout = Meteor.setTimeout(() => {
      setFormatted(
        complete(date, {
          minimumUnit,
          maxElements,
          terse,
          now,
        }),
      );
    }, formatted.millisUntilChange);

    return () => {
      Meteor.clearTimeout(timeout);
    };
  }, [
    date,
    maxElements,
    minimumUnit,
    now,
    terse,
    formatted.millisUntilChange,
    // Note that we explicitly include formatted.formatted here so that we set a
    // new timeout if the formatted string changes but (by change) the
    // millisUntilChange does not.
    formatted.formatted,
  ]);

  return <span>{formatted.formatted}</span>;
};

export default RelativeTime;
