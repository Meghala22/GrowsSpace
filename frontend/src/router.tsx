import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { AppShell } from "./layouts/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { BookingPage } from "./pages/BookingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HomeRedirectPage } from "./pages/HomeRedirectPage";
import { LoginPage } from "./pages/LoginPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ServicesPage } from "./pages/ServicesPage";

function withProviders(element: ReactNode) {
  return <AuthProvider>{element}</AuthProvider>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: withProviders(<AppShell />),
    children: [
      { index: true, element: <HomeRedirectPage /> },
      { path: "services", element: <ServicesPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "book", element: <BookingPage /> },
          { path: "my-bookings", element: <MyBookingsPage /> },
        ],
      },
      {
        element: <ProtectedRoute requireAdmin />,
        children: [{ path: "admin", element: <AdminPage /> }],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
