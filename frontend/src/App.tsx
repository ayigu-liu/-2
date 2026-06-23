import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ErrorBoundary from "./components/ErrorBoundary";
import LobbyPage from "./pages/LobbyPage";
import TablePage from "./pages/TablePage";
import { getStoredUser } from "./api/client";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getStoredUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/table/:roomId"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <TablePage />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
