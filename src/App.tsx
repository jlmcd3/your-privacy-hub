import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import USStateAuthorities from "./pages/USStateAuthorities.tsx";
import GlobalAuthorities from "./pages/GlobalAuthorities.tsx";
import EnforcementTrackerPage from "./pages/EnforcementTracker.tsx";
import USPrivacyLaws from "./pages/USPrivacyLaws.tsx";
import GDPREnforcement from "./pages/GDPREnforcement.tsx";
import AIPrivacyRegulations from "./pages/AIPrivacyRegulations.tsx";
import GlobalPrivacyLaws from "./pages/GlobalPrivacyLaws.tsx";
import JurisdictionPage from "./pages/JurisdictionPage.tsx";
import RegulatorPage from "./pages/RegulatorPage.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import TopicHub from "./pages/TopicHub.tsx";
import Glossary from "./pages/Glossary.tsx";
import GlossaryTerm from "./pages/GlossaryTerm.tsx";
import Calendar from "./pages/Calendar.tsx";
import Timelines from "./pages/Timelines.tsx";
import TimelineDetail from "./pages/TimelineDetail.tsx";
import USStateComparison from "./pages/USStateComparison.tsx";
import Signup from "./pages/Signup.tsx";
import Login from "./pages/Login.tsx";
import Account from "./pages/Account.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import SubscribeSuccess from "./pages/SubscribeSuccess.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import Terms from "./pages/Terms.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Updates from "./pages/Updates.tsx";
import UpdateDetail from "./pages/UpdateDetail.tsx";
import FAQ from "./pages/FAQ.tsx";
import NotFound from "./pages/NotFound.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import SampleBrief from "./pages/SampleBrief.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import JurisdictionsHub from "./pages/JurisdictionsHub.tsx";
import GlobalJurisdictionComparison from "./pages/GlobalJurisdictionComparison.tsx";
import LegislationTracker from "./pages/LegislationTracker.tsx";
import BriefPreferences from "./pages/BriefPreferences.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import CheckEmail from "./pages/CheckEmail.tsx";
import Tools from "./pages/Tools.tsx";
import CookieConsent from "./pages/CookieConsent.tsx";
import HealthDataPrivacy from "./pages/HealthDataPrivacy.tsx";
import BiometricPrivacy from "./pages/BiometricPrivacy.tsx";
import BreachNotification from "./pages/BreachNotification.tsx";
import CrossBorderTransfers from "./pages/CrossBorderTransfers.tsx";
import GetIntelligence from "./pages/GetIntelligence.tsx";
import LegitimateInterestTracker from "./pages/LegitimateInterestTracker.tsx";
import AdminSeedLI from "./pages/AdminSeedLI.tsx";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/us-state-privacy-authorities" element={<Navigate to="/us-privacy-laws#state-authorities" replace />} />
          <Route path="/global-privacy-authorities" element={<GlobalAuthorities />} />
          <Route path="/enforcement-tracker" element={<EnforcementTrackerPage />} />
          <Route path="/us-privacy-laws" element={<USPrivacyLaws />} />
          <Route path="/us-state-privacy-laws" element={<Navigate to="/us-privacy-laws" replace />} />
          <Route path="/us-federal-privacy-law" element={<Navigate to="/us-privacy-laws" replace />} />
          <Route path="/gdpr-enforcement" element={<GDPREnforcement />} />
          <Route path="/ai-privacy-regulations" element={<AIPrivacyRegulations />} />
          <Route path="/global-privacy-laws" element={<GlobalPrivacyLaws />} />
          <Route path="/jurisdiction/:slug" element={<JurisdictionPage />} />
          <Route path="/jurisdictions" element={<JurisdictionsHub />} />
          <Route path="/regulator/:slug" element={<RegulatorPage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/topics/:slug" element={<TopicHub />} />
          <Route path="/glossary" element={<Glossary />} />
          <Route path="/glossary/:slug" element={<GlossaryTerm />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/timelines" element={<Timelines />} />
          <Route path="/timelines/:slug" element={<TimelineDetail />} />
          <Route path="/compare/us-states" element={<USStateComparison />} />
          <Route path="/compare/jurisdictions" element={<GlobalJurisdictionComparison />} />
          <Route path="/legislation-tracker" element={<LegislationTracker />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/cookie-consent" element={<CookieConsent />} />
          <Route path="/health-data-privacy" element={<HealthDataPrivacy />} />
          <Route path="/biometric-privacy" element={<BiometricPrivacy />} />
          <Route path="/breach-notification" element={<BreachNotification />} />
          <Route path="/cross-border-transfers" element={<CrossBorderTransfers />} />
          <Route path="/brief-preferences" element={<ProtectedRoute><BriefPreferences /></ProtectedRoute>} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/subscribe/success" element={<ProtectedRoute><SubscribeSuccess /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
           <Route path="/get-intelligence" element={<GetIntelligence />} />
           <Route path="/legitimate-interest-tracker" element={<LegitimateInterestTracker />} />
           <Route path="/admin/seed-li" element={<ProtectedRoute><AdminSeedLI /></ProtectedRoute>} />
           <Route path="/updates" element={<Updates />} />
           <Route path="/updates/:id" element={<UpdateDetail />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/sample-brief" element={<SampleBrief />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </HelmetProvider>
);

export default App;