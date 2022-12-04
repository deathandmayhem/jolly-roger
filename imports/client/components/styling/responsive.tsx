import { css } from 'styled-components';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const largerBreakpoints = {
  xs: 'sm' as Breakpoint,
  sm: 'md' as Breakpoint,
  md: 'lg' as Breakpoint,
  lg: 'xl' as Breakpoint,
};

function getBreakpoint(b: Breakpoint) {
  // Bootstrap breakpoints are stored as variables on the root element, but you
  // can't use a variable directly in a media query, so we have to pull it out
  // with code.
  return window.getComputedStyle(document.body).getPropertyValue(`--bs-breakpoint-${b}`);
}

export function mediaBreakpointDown(
  size: keyof typeof largerBreakpoints,
  body: ReturnType<typeof css>
) {
  // Use `calc` to work around max-width and min-width both being closed
  // intervals
  return css`
    @media (max-width: calc(${getBreakpoint(largerBreakpoints[size])} - 0.02px)) {
      ${body}
    }
  `;
}
