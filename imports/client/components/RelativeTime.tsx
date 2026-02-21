import { Meteor } from "meteor/meteor";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [formatted, setFormatted] = useState(
    complete(date, t, {
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
    const initial = complete(date, t, {
      minimumUnit,
      maxElements,
      terse,
      now,
    });
    setFormatted(initial);
  }, [date, maxElements, minimumUnit, now, terse, t]);

  useEffect(() => {
    // Set up reevaluation when we'd expect the string to change
    const timeout = Meteor.setTimeout(() => {
      setFormatted(
        complete(date, t, {
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
    // Note: We don't actually use formatted.formatted in this effect, but we
    // want to make sure we set a new timeout when it changes since it's
    // possible that (by some change) it changes but millisUntilChange doesn't
    formatted.formatted,
    t,
  ]);

  return <span>{formatted.formatted}</span>;
};

export default RelativeTime;
