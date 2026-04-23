import { Link } from "react-router-dom";
import { EmptyBlock } from "../components/EmptyBlock";

export function NotFoundPage() {
  return (
    <EmptyBlock
      title="Page not found"
      description="The page you requested does not exist in GrowSpace."
      action={
        <Link to="/" className="primary-button">
          Return home
        </Link>
      }
    />
  );
}
