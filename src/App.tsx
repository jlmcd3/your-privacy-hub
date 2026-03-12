import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import USStateAuthorities from "./pages/USStateAuthorities.tsx";
import GlobalAuthorities from "./pages/GlobalAuthorities.tsx";
import EnforcementTrackerPage from "./pages/EnforcementTracker.tsx";
import USStatePrivacyLaws from "./pages/USStatePrivacyLaws.tsx";
import GDPREnforcement from "./pages/GDPREnforcement.tsx";
import AIPrivacyRegulations from "./pages/AIPrivacyRegulations.tsx";
import USFederalPrivacyLaw from "./pages/USFederalPrivacyLaw.tsx";
import GlobalPrivacyLaws from "./pages/GlobalPrivacyLaws.tsx";
import JurisdictionPage from "./pages/JurisdictionPage.tsx";
import RegulatorPage from "./pages/RegulatorPage.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import Signup from "./pages/Signup.tsx";
import Login from "./pages/Login.tsx";
import Account from "./pages/Account.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import SubscribeSuccess from "./pages/SubscribeSuccess.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/us-state-privacy-authorities" element={<USStateAuthorities />} />
          <Route path="/global-privacy-authorities" element={<GlobalAuthorities />} />
          <Route path="/enforcement-tracker" element={<EnforcementTrackerPage />} />
          <Route path="/us-state-privacy-laws" element={<USStatePrivacyLaws />} />
          <Route path="/gdpr-enforcement" element={<GDPREnforcement />} />
          <Route path="/ai-privacy-regulations" element={<AIPrivacyRegulations />} />
          <Route path="/us-federal-privacy-law" element={<USFederalPrivacyLaw />} />
          <Route path="/global-privacy-laws" element={<GlobalPrivacyLaws />} />
          <Route path="/jurisdiction/:slug" element={<JurisdictionPage />} />
          <Route path="/regulator/:slug" element={<RegulatorPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/subscribe" element={<ProtectedRoute><Subscribe /></ProtectedRoute>} />
          <Route path="/subscribe/success" element={<ProtectedRoute><SubscribeSuccess /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
