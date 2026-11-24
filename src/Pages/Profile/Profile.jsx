import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getUserDisplayName } from "../../utils/userDisplay";
import { StudioHeading, StudioLink } from "../../studio/StudioPresentation";

export default function Profile() {
  const { user } = useAuth();
  return (
    <article className="studio-page studio-detail">
      <Link className="studio-back" to="/dashboard">← Studio</Link>
      <StudioHeading label="Account" title="Profile" intro={getUserDisplayName(user)} />
      <StudioLink to="/settings">Manage account settings</StudioLink>
    </article>
  );
}
