import { css } from "styled-components";

export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl";

// Bootstrap default breakpoints. Kept as JS constants so they're available at
// module load time (before CSS is injected and before .bootstrap-page exists).
const breakpoints: Record<Breakpoint, string> = {
  xs: "0",
  sm: "576px",
  md: "768px",
  lg: "992px",
  xl: "1200px",
};

const largerBreakpoints = {
  xs: "sm" as Breakpoint,
  sm: "md" as Breakpoint,
  md: "lg" as Breakpoint,
  lg: "xl" as Breakpoint,
};

export function mediaBreakpointDown(
  size: keyof typeof largerBreakpoints,
  body: ReturnType<typeof css>,
) {
  return css`
    /* stylelint-disable-next-line media-query-no-invalid */
    @media (width < ${breakpoints[largerBreakpoints[size]]}) {
      ${body}
    }
  `;
}
