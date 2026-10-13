import { useTranslation } from "react-i18next";
import styled from "styled-components";

// Deliberately styled-components rather than Bootstrap or Tailwind classes:
// when this banner shows, @scope is unsupported and both frameworks' styles
// are inert, so it must style itself.
const Banner = styled.div`
  padding: 12px 16px;
  background-color: #842029;
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 16px;
  text-align: center;
`;

// Both Bootstrap and Tailwind styles are wrapped in @scope, so browsers
// without it (Chrome <118, Safari <17.4, Firefox <146) render the app almost
// entirely unstyled. CSSScopeRule exists exactly when @scope is supported.
const UnsupportedBrowserNotice = () => {
  const { t } = useTranslation();

  if ("CSSScopeRule" in window) {
    return null;
  }

  return (
    <Banner role="alert">
      {t(
        "unsupportedBrowser.notice",
        "Jolly Roger requires a newer browser than this one, and will not display correctly. Please update your browser.",
      )}
    </Banner>
  );
};

export default UnsupportedBrowserNotice;
