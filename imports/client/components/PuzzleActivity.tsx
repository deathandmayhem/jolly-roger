import { Meteor } from "meteor/meteor";
import { useSubscribe, useTracker } from "meteor/react-meteor-data";
import { faCommentDots } from "@fortawesome/free-solid-svg-icons/faCommentDots";
import { faDoorOpen } from "@fortawesome/free-solid-svg-icons/faDoorOpen";
import { faFilePen } from "@fortawesome/free-solid-svg-icons/faFilePen";
import { faPeopleGroup } from "@fortawesome/free-solid-svg-icons/faPeopleGroup";
import { faPhoneVolume } from "@fortawesome/free-solid-svg-icons/faPhoneVolume";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Sparklines, SparklinesLine, SparklinesSpots } from "react-sparklines";
import styled, { css } from "styled-components";
import { calendarTimeFormat } from "../../lib/calendarTimeFormat";
import {
  ACTIVITY_GRANULARITY,
  ACTIVITY_SEGMENTS,
} from "../../lib/config/activityTracking";
import relativeTimeFormat from "../../lib/relativeTimeFormat";
import roundedTime from "../../lib/roundedTime";
import ActivityBuckets from "../ActivityBuckets";
import RelativeTime from "./RelativeTime";
import { mediaBreakpointDown } from "./styling/responsive";
import useSubscribeAvatars from "../hooks/useSubscribeAvatars";
import Peers from "../../lib/models/mediasoup/Peers";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { Subscribers } from "../subscribers";
import { PeopleListDiv } from "./styling/PeopleComponents";

const PuzzleActivityItems = styled.span`
  font-size: 14px;
  color: #666;
  display: flex;
  justify-content: flex-end;
  ${mediaBreakpointDown(
    "xs",
    css`
      justify-content: flex-start;
    `,
  )}
`;

const PuzzleActivityItem = styled.span`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
  margin: 0 0 0 0.5rem;

  span {
    margin-right: 0.25rem;
    margin-left: 0.125rem;
  }

  ${mediaBreakpointDown(
    "xs",
    css`
      justify-content: flex-start;
      margin-left: 0.125rem;
    `,
  )}
`;


const PuzzleOpenTime = styled(PuzzleActivityItem)`
  min-width: 4.66rem;
`;

const PuzzleActivitySparkline = styled(PuzzleActivityItem)`
  min-width: 6rem;
  max-width: 8rem;

  span {
    margin-right: 0;
  }
`;

const PuzzleActivityDetail = styled.div`
  display: grid;
  grid-template-columns: auto auto 1fr 2em;
  align-items: center;
  margin-bottom: 0.5rem;
  column-gap: 0.25rem;
  row-gap: 0.125rem;
`;

const PuzzleActivityDetailTimeRange = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
`;

interface PuzzleActivityProps {
  huntId: string;
  puzzleId: string;
  unlockTime: Date;
}

interface ViewerSubscriber {
  user: string;
  name: string | undefined;
  discordAccount: DiscordAccountType | undefined;
  tab: string | undefined;
}

const PuzzleActivity = ({
  huntId,
  puzzleId,
  unlockTime,
}: PuzzleActivityProps) => {
  const [finalBucket, setFinalBucket] = useState(
    roundedTime(ACTIVITY_GRANULARITY),
  );
  useEffect(() => {
    const nextBucket =
      roundedTime(ACTIVITY_GRANULARITY).getTime() + ACTIVITY_GRANULARITY;
    const timeout = nextBucket - Date.now();
    const timer = Meteor.setTimeout(() => {
      setFinalBucket(new Date(nextBucket));
    }, timeout);
    return () => Meteor.clearTimeout(timer);
  }, [finalBucket]);

  const { totals, chats, calls, documents, maxTotalCount } = useTracker(() => {
    // Build an array starting from now - ACTIVITY_GRANULARITY * ACTIVITY_BUCKETS to now
    // with ACTIVITY_GRANULARITY intervals.
    const counts = {
      totals: [] as number[],
      chats: [] as number[],
      calls: [] as number[],
      documents: [] as number[],
      maxTotalCount: 0,
    };

    counts.maxTotalCount = Math.max(
      1,
      ActivityBuckets.findOne(
        {
          hunt: huntId,
        },
        {
          sort: { totalUsers: -1 },
        },
      )?.totalUsers ?? 0,
    );

    for (let i = 0; i < ACTIVITY_SEGMENTS; i++) {
      const bucket = ActivityBuckets.findOne({
        hunt: huntId,
        puzzle: puzzleId,
        ts: new Date(finalBucket.getTime() - i * ACTIVITY_GRANULARITY),
      });

      counts.totals.unshift(bucket?.totalUsers ?? 0);
      counts.chats.unshift(bucket?.chatUsers ?? 0);
      counts.calls.unshift(bucket?.callUsers ?? 0);
      counts.documents.unshift(bucket?.documentUsers ?? 0);
    }

    // For the displayed value in the last bucket, use the larger of the last or
    // 2nd-to-last bucket. This prevents the number from dropping to 0
    // immediately at the start of a new bucket, without having to wait for the
    // next bucket to fill in.
    counts.totals[counts.totals.length - 1] = Math.max(
      counts.totals[counts.totals.length - 1] ?? 0,
      counts.totals[counts.totals.length - 2] ?? 0,
    );
    counts.chats[counts.chats.length - 1] = Math.max(
      counts.chats[counts.chats.length - 1] ?? 0,
      counts.chats[counts.chats.length - 2] ?? 0,
    );
    counts.calls[counts.calls.length - 1] = Math.max(
      counts.calls[counts.calls.length - 1] ?? 0,
      counts.calls[counts.calls.length - 2] ?? 0,
    );
    counts.documents[counts.documents.length - 1] = Math.max(
      counts.documents[counts.documents.length - 1] ?? 0,
      counts.documents[counts.documents.length - 2] ?? 0,
    );

    return counts;
  }, [finalBucket, huntId, puzzleId]);

  const unlockTooltip = (
    <Tooltip id={`puzzle-activity-unlock-${puzzleId}`}>
      Puzzle unlocked: {calendarTimeFormat(unlockTime)}
    </Tooltip>
  );

  const displayNumber = (buckets: number[]) => {
    return buckets[buckets.length - 1] ?? 0;
  };

  // add a list of people viewing a puzzle to activity
  const subscriberTopic = `puzzle:${puzzleId}`;
  const subscribersLoading = useSubscribe("subscribers.fetch", subscriberTopic);
  const callMembersLoading = useSubscribe(
    "mediasoup:metadata",
    huntId,
    puzzleId,
  );
  const avatarsLoading = useSubscribeAvatars(huntId);

  const loading =
    subscribersLoading() || callMembersLoading() || avatarsLoading();


  const { unknown, viewers, rtcViewers } = useTracker(() => {
    if (loading) {
      return {
        unknown: 0,
        viewers: [],
        rtcViewers: [],
        selfPeer: undefined,
      };
    }

    let unknownCount = 0;
    const viewersAcc: ViewerSubscriber[] = [];

    const rtcViewersAcc: ViewerSubscriber[] = [];
    const rtcViewerIndex: Record<string, boolean> = {};

    const rtcParticipants = Peers.find({
      hunt: huntId,
      call: puzzleId,
    }).fetch();
    rtcParticipants.forEach((p) => {
      const user = MeteorUsers.findOne(p.createdBy);
      if (!user?.displayName) {
        unknownCount += 1;
        return;
      }

      // If the same user is joined twice (from two different tabs), dedupe in
      // the viewer listing. (We include both in rtcParticipants still.)
      rtcViewersAcc.push({
        user: user._id,
        name: user.displayName,
        discordAccount: user.discordAccount,
        tab: p.tab,
      });
      rtcViewerIndex[user._id] = true;
    });

    Subscribers.find({ name: subscriberTopic }).forEach((s) => {
      if (rtcViewerIndex[s.user]) {
        // already counted among rtcViewers, don't duplicate
        return;
      }

      const user = MeteorUsers.findOne(s.user);
      if (!user?.displayName) {
        unknownCount += 1;
        return;
      }

      viewersAcc.push({
        user: s.user,
        name: user.displayName,
        discordAccount: user.discordAccount,
        tab: undefined,
      });
    });

    return {
      unknown: unknownCount,
      viewers: viewersAcc,
      rtcViewers: rtcViewersAcc,
    };
  }, [loading, subscriberTopic, huntId, puzzleId]);

  const totalViewers = rtcViewers.length + viewers.length;

  const viewerList = rtcViewers.concat(viewers).map((viewer) => (
    viewer.name
  ));

  const sparklineTooltip = (
    <Tooltip id={`puzzle-activity-sparkline-${puzzleId}`}>
      <div>{totalViewers > 0 ? ("People working on this puzzle") : ("Recent activity on this puzzle")}:</div>
      <div>
      <PeopleListDiv>
        {viewerList.join(', ')}
      </PeopleListDiv>
      {/* <PeopleListDiv>
        {.join(', ')}
        </PeopleListDiv> */}
      </div>
      <PuzzleActivityDetailTimeRange>
        <div>
          {/* Don't need to use RelativeTime here because this duration doesn't change, even as now
            does */}
          {relativeTimeFormat(
            new Date(Date.now() - ACTIVITY_GRANULARITY * ACTIVITY_SEGMENTS),
          )}
        </div>
        <div>now</div>
      </PuzzleActivityDetailTimeRange>
      <PuzzleActivityDetail>
        <div>
          <FontAwesomeIcon icon={faCommentDots} fixedWidth />
        </div>
        <div>Chat</div>
        <div>
          <Sparklines data={chats} min={0} max={Math.max(1, ...chats)}>
            <SparklinesLine color="white" />
            <SparklinesSpots
              spotColors={{ "-1": "white", 0: "white", 1: "white" }}
            />
          </Sparklines>
        </div>
        <div>{displayNumber(chats)}</div>
        <div>
          <FontAwesomeIcon icon={faPhoneVolume} fixedWidth />
        </div>
        <div>Call</div>
        <div>
          <Sparklines data={calls} min={0} max={Math.max(1, ...calls)}>
            <SparklinesLine color="white" />
            <SparklinesSpots
              spotColors={{ "-1": "white", 0: "white", 1: "white" }}
            />
          </Sparklines>
        </div>
        <div>{displayNumber(calls)}</div>
        <div>
          <FontAwesomeIcon icon={faFilePen} fixedWidth />
        </div>
        <div>Doc</div>
        <div>
          <Sparklines data={documents} min={0} max={Math.max(1, ...documents)}>
            <SparklinesLine color="white" />
            <SparklinesSpots
              spotColors={{ "-1": "white", 0: "white", 1: "white" }}
            />
          </Sparklines>
        </div>
        <div>{displayNumber(documents)}</div>
      </PuzzleActivityDetail>
    </Tooltip>
  );

  return (
    <PuzzleActivityItems>
      <OverlayTrigger placement="top" overlay={unlockTooltip}>
        <PuzzleOpenTime>
          <FontAwesomeIcon icon={faDoorOpen} />
          <RelativeTime
            date={unlockTime}
            terse
            minimumUnit="minute"
            maxElements={2}
          />
        </PuzzleOpenTime>
      </OverlayTrigger>
      <OverlayTrigger placement="top" overlay={sparklineTooltip}>
        <PuzzleActivitySparkline>
          <FontAwesomeIcon icon={faPeopleGroup} fixedWidth />
          {/* Sparklines doesn't accept a className argument, so we can't use styled-components */}
          <Sparklines
            data={totals}
            min={0}
            max={maxTotalCount}
            style={{ width: "100%" }}
          >
            <SparklinesLine />
            <SparklinesSpots
              spotColors={{ "-1": "black", 0: "black", 1: "black" }}
            />
          </Sparklines>
          <span>{displayNumber(totals)}/{totalViewers}</span>
        </PuzzleActivitySparkline>
      </OverlayTrigger>
    </PuzzleActivityItems>
  );
};

export default PuzzleActivity;
