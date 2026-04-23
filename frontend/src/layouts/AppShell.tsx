import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const baseLinks = [
  { to: "/services", label: "Services" },
  { to: "/book", label: "Book" },
  { to: "/my-bookings", label: "My Bookings" },
];

export function AppShell() {
  const auth = useAuth();
  const links = auth.isAuthenticated
    ? auth.isAdmin
      ? [
          { to: "/admin", label: "Admin Overview" },
          { to: "/services", label: "Services" },
          { to: "/book", label: "Create Booking" },
          { to: "/my-bookings", label: "My Account" },
        ]
      : [{ to: "/dashboard", label: "Dashboard" }, ...baseLinks]
    : [{ to: "/services", label: "Services" }, { to: "/login", label: "Login" }, { to: "/register", label: "Register" }];

  return (
    <div className="min-h-screen">
      <header className="px-4 pt-4 md:px-8 md:pt-6">
        <div className="panel mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <NavLink to="/" className="font-display text-3xl italic text-moss-900">
              GrowSpace
            </NavLink>
            <p className="text-sm text-moss-700">
              {auth.isAdmin
                ? "Admin control center for users, slots, and bookings."
                : "Concurrency-safe workshop and plant station booking."}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-moss-700 text-white"
                      : "text-moss-800 hover:bg-moss-50"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {auth.user ? (
              <>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-semibold text-ink">{auth.user.name}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-moss-600">
                    {auth.user.role}
                  </p>
                </div>
                <button type="button" onClick={auth.logout} className="secondary-button">
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/register" className="primary-button">
                Create account
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
