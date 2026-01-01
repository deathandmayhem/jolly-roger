import "styled-components";
import type { Theme } from "../imports/client/theme";

declare module "styled-components" {
  export interface DefaultTheme extends Theme {}
}
