import Documents from "../../lib/models/Documents";
import MeteorUsers from "../../lib/models/MeteorUsers";
import documentsForPuzzleDeleteModal from "../../lib/publications/documentsForPuzzleDeleteModal";
import definePublication from "./definePublication";

definePublication(documentsForPuzzleDeleteModal, {
  async run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return Documents.find({
      hunt: huntId,
    });
  },
});
