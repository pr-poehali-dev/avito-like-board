import { useParams, useNavigate } from "react-router-dom";
import AdDetail from "./AdDetail";

export default function AdPage() {
  const { adId } = useParams<{ adId: string }>();
  const navigate = useNavigate();

  if (!adId) return null;

  return (
    <AdDetail
      adId={Number(adId)}
      onBack={() => navigate(-1)}
      onAddToFolder={() => {}}
      isFavorited={false}
      currentUserId={null}
    />
  );
}
