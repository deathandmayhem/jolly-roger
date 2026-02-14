import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import styled from "styled-components";

const Nav = styled.nav`
  width: 200px;
  flex: 0 0 200px;
  border-right: 1px solid ${({ theme }) => theme.colors.navBarBottomBorder};
  padding: 8px 0;
`;

const StyledNavLink = styled(NavLink)`
  display: block;
  padding: 6px 16px;
  color: inherit;
  text-decoration: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.navBarBackground};
  }

  &.active {
    font-weight: bold;
  }
`;

const AdminNav = () => {
  const { t } = useTranslation();
  return (
    <Nav>
      <StyledNavLink to="/admin/setup">
        {t("navigation.adminSetup", "Setup")}
      </StyledNavLink>
      <StyledNavLink to="/admin/jobs">
        {t("navigation.adminJobs", "Jobs")}
      </StyledNavLink>
      <StyledNavLink to="/admin/rtcdebug">
        {t("navigation.adminRtcDebug", "RTC Debug")}
      </StyledNavLink>
    </Nav>
  );
};

export default AdminNav;
