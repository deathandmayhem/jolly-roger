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

  // biome-ignore lint/correctness/useExhaustiveDependencies(formatted.formatted): We explicitly include this so that we set a new timeout if the formatted string changes but (by chance) millisUntilChange doesn't
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
    formatted.formatted,
    t,
  ]);

  return <span>{formatted.formatted}</span>;
};

export default RelativeTime;
