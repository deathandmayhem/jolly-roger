import React, { useMemo } from "react";
import styled, { useTheme } from "styled-components";
import type { Theme } from "../theme";

export interface ActivityItem {
  _id?: string;
  huntId: string;
  dayOfWeek: number;
  hour: number;
  count: number;
  type: string;
}

const StyledContainer = styled.div<{ theme: Theme }>`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.secondary};
  border: 1px solid ${({ theme }) => theme.colors.text};
  border-radius: 6px;
  padding: 16px;
  max-width: 90%;
  margin: 20px auto;
  overflow-x: auto;
  background-color: ${({ theme }) => theme.colors.background};
`;

const GraphLayout = styled.div`
  display: flex;
  align-items: flex-start;
`;

const DayLabelsSide = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(7 * (15px + 2px) - 2px);
  margin-right: 8px;
  padding-top: 2px;
  padding-bottom: 2px;
`;

const DayLabel = styled.div`
  height: 15px;
  line-height: 15px;
  flex-grow: 1;
  text-align: right;
  min-width: 30px;
  margin-bottom: 2px;
  font-family: monospace;

  &:last-child {
    margin-bottom: 0;
  }
`;

const GridAndHoursContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const HourLabelsTop = styled.div`
  display: flex;
  margin-bottom: 4px;
  padding-right: 2px;
  width: calc(24 * (15px + 2px) - 2px);
`;

const HourLabel = styled.div<{ $isVisible: boolean }>`
  max-width: 15px;
  text-align: left;
  padding-right: 1px;
  font-family: monospace;
  visibility: ${(props) => (props.$isVisible ? "visible" : "hidden")};
  ${(props) =>
    props.$isVisible &&
    `
    min-width: calc(15px + 2 * (15px + 2px));
  `}
`;

const GraphGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(24, 15px);
  grid-template-rows: repeat(7, 15px);
  grid-auto-flow: row;
  gap: 2px;
  border-collapse: separate;
`;

const GraphCell = styled.div<{ $bgColorVar: string; theme: Theme }>`
  width: 15px;
  height: 15px;
  border-radius: 2px;
  background-color: ${(props) => props.$bgColorVar};
  box-sizing: border-box;
  cursor: default;

  &:hover {
    outline: 1px solid ${({ theme }) => theme.colors.secondary};
    outline-offset: -1px;
  }
`;

const GraphLegend = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 10px;
  font-size: 11px;
`;

const LegendColor = styled.div<{ $colorVar: string; theme: Theme }>`
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin: 0 1px;
  background-color: ${(props) => props.$colorVar};
  border: 1px solid ${({ theme }) => theme.colors.text};
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
`;

const ContributionGraph = ({
  data,
  showCount,
  title,
}: {
  data: ActivityItem[];
  showCount?: boolean;
  title?: string;
}) => {
  const theme = useTheme();
  const colorVars = theme.colors.contributionsGraph;

  const contributionData = useMemo(() => {
    const counts = {};
    for (let i = 0; i < 7; i++) {
      // 0=Sun, 1=Mon, ..., 6=Sat
      counts[i] = {};
      for (let j = 0; j < 24; j++) {
        counts[i][j] = { total: 0 };
      }
    }

    let maxTotalCount = 0;
    let totalContributions = 0;

    if (!Array.isArray(data)) {
      return { counts: {}, maxTotalCount: 0, totalContributions: 0 };
    }

    data.forEach((item) => {
      const { dayOfWeek, hour, type, count } = item;

      const slotData = counts[dayOfWeek][hour];

      slotData.total += count;
      slotData[type] = (slotData[type] || 0) + count;

      totalContributions += count;

      if (slotData.total > maxTotalCount) {
        maxTotalCount = slotData.total;
      }
    });

    return { counts, maxTotalCount, totalContributions };
  }, [data]);

  const getColorVar = (totalCount: number, maxTotalCount: number) => {
    if (totalCount === 0) return colorVars[0];
    if (maxTotalCount === 0) return colorVars[1];
    const intensityRatio = totalCount / maxTotalCount;
    if (intensityRatio <= 0) return colorVars[0];
    if (intensityRatio <= 0.25) return colorVars[1];
    if (intensityRatio <= 0.5) return colorVars[2];
    if (intensityRatio <= 0.75) return colorVars[3];
    return colorVars[4];
  };

  const getTooltipText = (dayIndex: number, hour: number, slotData) => {
    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][dayIndex];
    const timeSuffix = `on ${dayName}s at ${hour}:00 - ${hour}:59`;

    if (!slotData || slotData.total === 0) {
      return `No activity ${timeSuffix}`;
    }

    const typeBreakdown = Object.entries(slotData)
      .filter(([key, value]) => key !== "total" && value > 0) // Only include types with count > 0
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");

    return `Total: ${slotData.total} activit${slotData.total === 1 ? "y" : "ies"} (${typeBreakdown}) ${timeSuffix}`;
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayIndices = [0, 1, 2, 3, 4, 5, 6];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <StyledContainer>
      {title && <h2>{title}</h2>}
      <GraphLayout>
        <DayLabelsSide>
          {daysOfWeek.map((day) => (
            <DayLabel key={`dl-${day}`}>{day}</DayLabel>
          ))}
        </DayLabelsSide>

        <GridAndHoursContainer>
          <GraphGrid>
            {dayIndices.map((dayIndex) =>
              hours.map((hour) => {
                const slotData = contributionData.counts[dayIndex]?.[hour];
                const totalCount = slotData?.total ?? 0;

                const colorVar = getColorVar(
                  totalCount,
                  contributionData.maxTotalCount,
                );

                const title = getTooltipText(dayIndex, hour, slotData);

                return (
                  <GraphCell
                    key={`${dayIndex}-${hour}`}
                    $bgColorVar={colorVar}
                    title={title}
                    aria-label={title}
                  >
                    <VisuallyHidden>{title}</VisuallyHidden>
                  </GraphCell>
                );
              }),
            )}
          </GraphGrid>
          <HourLabelsTop>
            {hours.map((hour) => {
              const isVisible = hour % 3 === 0;
              return (
                <HourLabel key={`hl-${hour}`} $isVisible={isVisible}>
                  {isVisible ? hour.toString().padStart(2, "0") : ""}
                </HourLabel>
              );
            })}
          </HourLabelsTop>
        </GridAndHoursContainer>
      </GraphLayout>

      {/* Legend */}
      <GraphLegend>
        <span>Less</span>
        {colorVars.map((colorVar: string) => (
          <LegendColor key={colorVar} $colorVar={colorVar} />
        ))}
        <span>More</span>
      </GraphLegend>
      {showCount && (
        <div className="total-contributions">
          Total activities: {contributionData.totalContributions}
        </div>
      )}
    </StyledContainer>
  );
};

export default ContributionGraph;
