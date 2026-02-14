import { Meteor } from "meteor/meteor";
import { useTracker } from "meteor/react-meteor-data";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import styled from "styled-components";
import isAdmin from "../../../lib/isAdmin";
import { useBreadcrumb } from "../../hooks/breadcrumb";
import AdminNav from "./AdminNav";

const AdminLayout = styled.div`
  display: flex;
  flex-flow: row nowrap;
`;

const AdminContent = styled.div`
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: hidden;
  padding: 0 max(env(safe-area-inset-right, 0px), 15px) 0
    max(env(safe-area-inset-left, 0px), 15px);
`;

const AdminApp = () => {
  const { t } = useTranslation();
  useBreadcrumb({
    title: t("navigation.admin", "Admin"),
    path: "/admin",
  });

  const canConfigure = useTracker(() => isAdmin(Meteor.user()), []);

  if (!canConfigure) {
    return (
      <div>
        <h1>{t("common.notAuthorized", "Not authorized")}</h1>
        <p>
          {t(
            "serverSetup.notAuthorizedMessage",
            `This page allows server admins to reconfigure the server, but
             you're not an admin.`,
          )}
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <AdminNav />
      <AdminContent>
        <Outlet />
      </AdminContent>
    </AdminLayout>
  );
};

export default AdminApp;
