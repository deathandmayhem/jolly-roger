import { useTracker } from "meteor/react-meteor-data";
import { useParams } from "react-router-dom";
import Hunts from "../../lib/models/Hunts";
import { useBreadcrumb } from "../hooks/breadcrumb";
import { StyledIframe } from "./DocumentDisplay";
import FixedLayout from "./styling/FixedLayout";

const CustomLinkEmbedPage = () => {
  const huntId = useParams<"huntId">().huntId!;

  const { customLinkUrl, customLinkTitle } = useTracker(() => {
    const hunt = Hunts.findOne(huntId);
    return {
      customLinkUrl: hunt?.customLinkUrl,
      customLinkTitle: hunt?.customLinkTitle,
    };
  }, [huntId]);

  useBreadcrumb({
    title: customLinkTitle ?? "Custom Link",
    path: `/hunts/${huntId}/custom-link`,
  });

  return (
    <FixedLayout>
      <StyledIframe
        src={customLinkUrl}
        $isShown={true}
        title={customLinkTitle}
      />
    </FixedLayout>
  );
};

export default CustomLinkEmbedPage;
