import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";

import GlobalAuthorities from "./pages/GlobalAuthorities.tsx";

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
import ClientsPortfolio from "./pages/ClientsPortfolio.tsx";
import RopaHome from "./pages/ropa/RopaHome.tsx";
import RopaSetup from "./pages/ropa/RopaSetup.tsx";
import RopaActivities from "./pages/ropa/RopaActivities.tsx";
import RopaActivity from "./pages/ropa/RopaActivity.tsx";
import RopaReview from "./pages/ropa/RopaReview.tsx";
import RopaDocuments from "./pages/ropa/RopaDocuments.tsx";
import RopaRefresh from "./pages/ropa/RopaRefresh.tsx";
import RopaLanding from "./pages/ropa/RopaLanding.tsx";
import USNoticeHome from "./pages/us-notices/USNoticeHome.tsx";
import USNoticeMode from "./pages/us-notices/USNoticeMode.tsx";
import USNoticeStates from "./pages/us-notices/USNoticeStates.tsx";
import USNoticeQuestions from "./pages/us-notices/USNoticeQuestions.tsx";
import USNoticeReview from "./pages/us-notices/USNoticeReview.tsx";
import USNoticeDocuments from "./pages/us-notices/USNoticeDocuments.tsx";
import USNoticeRefresh from "./pages/us-notices/USNoticeRefresh.tsx";
import USNoticeLanding from "./pages/us-notices/USNoticeLanding.tsx";
import EUNoticeHome from "./pages/eu-notices/EUNoticeHome.tsx";
import EUNoticeMode from "./pages/eu-notices/EUNoticeMode.tsx";
import EUNoticeFrameworks from "./pages/eu-notices/EUNoticeFrameworks.tsx";
import EUNoticeQuestions from "./pages/eu-notices/EUNoticeQuestions.tsx";
import EUNoticeReview from "./pages/eu-notices/EUNoticeReview.tsx";
import EUNoticeDocuments from "./pages/eu-notices/EUNoticeDocuments.tsx";
import EUNoticeRefresh from "./pages/eu-notices/EUNoticeRefresh.tsx";
import EUNoticeLanding from "./pages/eu-notices/EUNoticeLanding.tsx";
import NoticesRopaHub from "./pages/NoticesRopaHub.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Subscribe from "./pages/Subscribe.tsx";
import SubscribeSuccess from "./pages/SubscribeSuccess.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import SubscriberRoute from "./components/SubscriberRoute.tsx";
import CanonicalTag from "./components/CanonicalTag.tsx";
import TestGovernanceAssessment from "./pages/admin/TestGovernanceAssessment";
import TestLIA from "./pages/admin/TestLIA";
import TestDPIA from "./pages/admin/TestDPIA";
import TestDPA from "./pages/admin/TestDPA";
import TestDPAUSState from "./pages/admin/TestDPAUSState";
import TestDPADualCompliance from "./pages/admin/TestDPADualCompliance";
import TestDPACanada from "./pages/admin/TestDPACanada";
import TestIRPlaybook from "./pages/admin/TestIRPlaybook";
import TestIRPlaybookUS from "./pages/admin/TestIRPlaybookUS";
import TestBiometric from "./pages/admin/TestBiometric";
import TestCPPAScope from "./pages/admin/TestCPPAScope";
import TestCPPARisk from "./pages/admin/TestCPPARisk";
import TestCPPACyber from "./pages/admin/TestCPPACyber";
import TestRoPA from "./pages/admin/TestRoPA";
import TestUSNotice from "./pages/admin/TestUSNotice";
import TestEUNotice from "./pages/admin/TestEUNotice";
import TestRegistration from "./pages/admin/TestRegistration";
import TestBrief from "./pages/admin/TestBrief";
import CronStatus from "./pages/admin/CronStatus";
import AdminSubscribers from "./pages/admin/AdminSubscribers";
import ResponsivePreview from "./pages/admin/ResponsivePreview";
import Terms from "./pages/Terms.tsx";
import PrivacyPolicy from "./pages/PrivacyPolicy.tsx";
import Updates from "./pages/Updates.tsx";
import UpdateDetail from "./pages/UpdateDetail.tsx";
import FAQ from "./pages/FAQ.tsx";
import NotFound from "./pages/NotFound.tsx";
import LogoPreview from "./pages/LogoPreview.tsx";
import DevOnly from "./components/DevOnly.tsx";
import AdminOnly from "./components/AdminOnly.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";

import ScrollToTop from "./components/ScrollToTop.tsx";
import ScrollToTopButton from "./components/ScrollToTopButton.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";
import BlankScreenDiagnostic from "./components/BlankScreenDiagnostic.tsx";
import JurisdictionsHub from "./pages/JurisdictionsHub.tsx";

import LegislationTracker from "./pages/LegislationTracker.tsx";
import BriefPreferences from "./pages/BriefPreferences.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import CheckEmail from "./pages/CheckEmail.tsx";
import OnboardingProfile from "./pages/OnboardingProfile.tsx";
import Tools from "./pages/Tools.tsx";
import StartNew from "./pages/StartNew.tsx";
import CookieConsent from "./pages/CookieConsent.tsx";
import HealthDataPrivacy from "./pages/HealthDataPrivacy.tsx";
import BiometricPrivacy from "./pages/BiometricPrivacy.tsx";
import BreachNotification from "./pages/BreachNotification.tsx";
import CrossBorderTransfers from "./pages/CrossBorderTransfers.tsx";
import GetIntelligence from "./pages/GetIntelligence.tsx";
import LegitimateInterestTracker from "./pages/LegitimateInterestTracker.tsx";
import AdminSeedLI from "./pages/AdminSeedLI.tsx";
import AdminIngestionDashboard from "./pages/AdminIngestionDashboard.tsx";
import AdminJurisdictionAudit from "./pages/admin/AdminJurisdictionAudit.tsx";
import AdminArticles from "./pages/AdminArticles.tsx";
import AdminEmailSignups from "./pages/AdminEmailSignups.tsx";
import AdminGatingLeaks from "./pages/AdminGatingLeaks.tsx";
import AdminBriefGenStatus from "./pages/AdminBriefGenStatus.tsx";
import AdminPricingReconciliation from "./pages/AdminPricingReconciliation.tsx";
import AdminLawUpdates from "./pages/AdminLawUpdates.tsx";
import LIAssessment from "./pages/LIAssessment.tsx";
import LIAssessmentIntake from "./pages/LIAssessmentIntake.tsx";
import LIAssessmentResult from "./pages/LIAssessmentResult.tsx";
import GovernanceAssessment from "./pages/GovernanceAssessment.tsx";
import GovernanceAssessmentResult from "./pages/GovernanceAssessmentResult.tsx";
import DPIAFramework from "./pages/DPIAFramework.tsx";
import DPIAFrameworkResult from "./pages/DPIAFrameworkResult.tsx";
import Enforcement from "./pages/Enforcement.tsx";
import EnforcementActionDetail from "./pages/EnforcementActionDetail.tsx";
import DPAGenerator from "./pages/DPAGenerator.tsx";
import IRPlaybook from "./pages/IRPlaybook.tsx";
import BiometricChecker from "./pages/BiometricChecker.tsx";
import Horizon from "./pages/Horizon.tsx";
import RegistrationLanding from "./pages/RegistrationLanding.tsx";
import RegistrationAssessment from "./pages/RegistrationAssessment.tsx";
import RegistrationAssessmentResult from "./pages/RegistrationAssessmentResult.tsx";
import RegistrationOrder from "./pages/RegistrationOrder.tsx";
import RegistrationDocuments from "./pages/RegistrationDocuments.tsx";
import RegistrationMyFilings from "./pages/RegistrationMyFilings.tsx";
import Watchlist from "./pages/Watchlist.tsx";
import MyReports from "./pages/MyReports.tsx";
import DPAResult from "./pages/DPAResult.tsx";
import IRPlaybookResult from "./pages/IRPlaybookResult.tsx";
import BiometricCheckerResult from "./pages/BiometricCheckerResult.tsx";
import CPPAScopeChecker from "./pages/CPPAScopeChecker.tsx";
import CPPARiskAssessment from "./pages/CPPARiskAssessment.tsx";
import CPPARiskAssessmentResult from "./pages/CPPARiskAssessmentResult.tsx";
import CPPACybersecurity from "./pages/CPPACybersecurity.tsx";
import CPPACybersecurityResult from "./pages/CPPACybersecurityResult.tsx";
import CPPASuiteResult from "./pages/CPPASuiteResult.tsx";
import TestsDashboard from "./pages/admin/TestsDashboard.tsx";
import TestsOutput from "./pages/admin/TestsOutput.tsx";
import CorpusExtractionAdmin from "./pages/admin/CorpusExtractionAdmin";
import VerificationScanAdmin from "./pages/admin/VerificationScanAdmin";
import PrimarySourceFetcher from "./pages/admin/PrimarySourceFetcher";
import CPPACorpusAdmin from "./pages/admin/CPPACorpusAdmin";
import CPPAEvalHarness from "./pages/admin/CPPAEvalHarness";

const queryClient = new QueryClient();

function CategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/updates?topic=${slug ?? ""}`} replace />;
}

function TopicRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/updates?topic=${slug ?? ""}`} replace />;
}

function PaymentReturnRedirect({ to }: { to: string }) {
  const { search } = useLocation();
  const { id } = useParams<{ id: string }>();
  const target = id ? `${to}/${id}` : to;
  return <Navigate to={`${target}${search}`} replace />;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ScrollToTopButton />
          <PaymentTestModeBanner />
          <BlankScreenDiagnostic />
          <CanonicalTag />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/logo-preview" element={<LogoPreview />} />
            <Route path="/us-state-privacy-authorities" element={<Navigate to="/us-privacy-laws#authority-directory" replace />} />
            <Route path="/global-privacy-authorities" element={<GlobalAuthorities />} />
            <Route path="/enforcement" element={<Enforcement />} />
            <Route path="/enforcement/:id" element={<EnforcementActionDetail />} />
            <Route path="/enforcement-tracker" element={<Navigate to="/enforcement" replace />} />
            <Route path="/enforcement-intelligence" element={<Navigate to="/enforcement" replace />} />
            <Route path="/lia-assessment" element={<Navigate to="/li-assessment" replace />} />
            <Route path="/lia-tool" element={<Navigate to="/li-assessment" replace />} />
            <Route path="/governance" element={<Navigate to="/governance-assessment" replace />} />
            <Route path="/registration-documents" element={<Navigate to="/registration-manager" replace />} />
            <Route path="/enforcement-intelligence/:id" element={<EnforcementActionDetail />} />
            <Route path="/us-privacy-laws" element={<USPrivacyLaws />} />
            <Route path="/us-state-privacy-laws" element={<Navigate to="/us-privacy-laws" replace />} />
            <Route path="/us-federal-privacy-law" element={<Navigate to="/us-privacy-laws" replace />} />
            <Route path="/gdpr-enforcement" element={<GDPREnforcement />} />
            <Route path="/ai-privacy-regulations" element={<AIPrivacyRegulations />} />
            <Route path="/global-privacy-laws" element={<GlobalPrivacyLaws />} />
            <Route path="/jurisdiction/:slug" element={<JurisdictionPage />} />
            <Route path="/jurisdictions" element={<JurisdictionsHub />} />
            <Route path="/regulator/:slug" element={<RegulatorPage />} />
            <Route path="/category/:slug" element={<CategoryRedirect />} />
            <Route path="/topics/:slug" element={<TopicRedirect />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/glossary/:slug" element={<GlossaryTerm />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/timelines" element={<Timelines />} />
            <Route path="/timelines/:slug" element={<TimelineDetail />} />
            <Route path="/compare/us-states" element={<USStateComparison />} />
            
            <Route path="/legislation-tracker" element={<LegislationTracker />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/start" element={<StartNew />} />
            <Route path="/cookie-consent" element={<CookieConsent />} />
            <Route path="/health-data-privacy" element={<HealthDataPrivacy />} />
            <Route path="/biometric-privacy" element={<BiometricPrivacy />} />
            <Route path="/breach-notification" element={<BreachNotification />} />
            <Route path="/cross-border-transfers" element={<CrossBorderTransfers />} />
            <Route
              path="/brief-preferences"
              element={
                <ProtectedRoute>
                  <BriefPreferences />
                </ProtectedRoute>
              }
            />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route
              path="/onboarding-profile"
              element={
                <ProtectedRoute>
                  <OnboardingProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <ClientsPortfolio />
                </ProtectedRoute>
              }
            />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route
              path="/subscribe/success"
              element={
                <ProtectedRoute>
                  <SubscribeSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dpa-generator/result/:id"
              element={
                <ProtectedRoute>
                  <DPAResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ir-playbook/result/:id"
              element={
                <ProtectedRoute>
                  <IRPlaybookResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/biometric-checker/result/:id"
              element={
                <ProtectedRoute>
                  <BiometricCheckerResult />
                </ProtectedRoute>
              }
            />
            <Route path="/get-intelligence" element={<GetIntelligence />} />
            <Route path="/legitimate-interest-tracker" element={<LegitimateInterestTracker />} />
            <Route
              path="/admin/seed-li"
              element={
                <ProtectedRoute>
                  <AdminSeedLI />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/ingestion"
              element={
                <ProtectedRoute>
                  <AdminIngestionDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/jurisdiction-audit"
              element={
                <ProtectedRoute>
                  <AdminJurisdictionAudit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/articles"
              element={
                <ProtectedRoute>
                  <AdminArticles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/email-signups"
              element={
                <ProtectedRoute>
                  <AdminEmailSignups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/gating-leaks"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminGatingLeaks />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/briefgen-status"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminBriefGenStatus />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pricing"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminPricingReconciliation />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cron-status"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <CronStatus />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscribers"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminSubscribers />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/responsive"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <ResponsivePreview />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/law-updates"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminLawUpdates />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tests"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestsDashboard />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/corpus-extraction"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <CorpusExtractionAdmin />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/verification-scan"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <VerificationScanAdmin />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/primary-source-fetcher"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <PrimarySourceFetcher />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cppa-corpus"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <CPPACorpusAdmin />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cppa-eval"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <CPPAEvalHarness />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />


            <Route
              path="/admin/test-governance"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestGovernanceAssessment />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-lia"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestLIA />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-dpia"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestDPIA />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-dpa"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestDPA />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-dpa-us"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestDPAUSState />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-dpa-dual"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestDPADualCompliance />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-dpa-canada"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestDPACanada />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-ir-playbook-us"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestIRPlaybookUS />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-ir-playbook"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestIRPlaybook />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-biometric"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestBiometric />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-cppa-scope"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestCPPAScope />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-cppa-risk"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestCPPARisk />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-cppa-cyber"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestCPPACyber />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-ropa"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestRoPA />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-us-notice"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestUSNotice />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-eu-notice"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestEUNotice />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-registration"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestRegistration />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/test-brief"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestBrief />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tests-output"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestsOutput />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route path="/li-assessment" element={<LIAssessment />} />
            <Route path="/li-assessment/intake/:id" element={<LIAssessmentIntake />} />
            <Route
              path="/li-assessment/result/:id"
              element={
                <ProtectedRoute>
                  <LIAssessmentResult />
                </ProtectedRoute>
              }
            />
            <Route path="/governance-assessment" element={<GovernanceAssessment />} />
            <Route
              path="/governance-assessment/result/:id"
              element={
                <ProtectedRoute>
                  <GovernanceAssessmentResult />
                </ProtectedRoute>
              }
            />
            <Route path="/dpia-framework" element={<DPIAFramework />} />
            <Route
              path="/dpia-framework/result/:id"
              element={
                <ProtectedRoute>
                  <DPIAFrameworkResult />
                </ProtectedRoute>
              }
            />
            <Route path="/dpa-generator" element={<DPAGenerator />} />
            <Route path="/ir-playbook" element={<IRPlaybook />} />
            <Route path="/biometric-checker" element={<BiometricChecker />} />
            {/* CPPA Audit Readiness Suite */}
            <Route path="/cppa-scope-checker" element={<CPPAScopeChecker />} />
            <Route path="/cppa-risk-assessment" element={<CPPARiskAssessment />} />
            <Route
              path="/cppa-risk-assessment/result/:id"
              element={
                <ProtectedRoute>
                  <CPPARiskAssessmentResult />
                </ProtectedRoute>
              }
            />
            <Route path="/cppa-cybersecurity" element={<CPPACybersecurity />} />
            <Route
              path="/cppa-cybersecurity/result/:id"
              element={
                <ProtectedRoute>
                  <CPPACybersecurityResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cppa-suite/result"
              element={
                <ProtectedRoute>
                  <CPPASuiteResult />
                </ProtectedRoute>
              }
            />
            <Route path="/horizon" element={<Horizon />} />
            {/* Combined Notices & RoPA hub */}
            <Route path="/notices-ropa" element={<ProtectedRoute><NoticesRopaHub /></ProtectedRoute>} />
            {/* RoPA Builder */}
            <Route path="/ropa" element={<SubscriberRoute><RopaHome /></SubscriberRoute>} />
            <Route path="/ropa/setup" element={<SubscriberRoute><RopaSetup /></SubscriberRoute>} />
            <Route path="/ropa/activities" element={<SubscriberRoute><RopaActivities /></SubscriberRoute>} />
            <Route path="/ropa/activity/:id" element={<SubscriberRoute><RopaActivity /></SubscriberRoute>} />
            <Route path="/ropa/review/:sessionId" element={<SubscriberRoute><RopaReview /></SubscriberRoute>} />
            <Route path="/ropa/review" element={<SubscriberRoute><RopaReview /></SubscriberRoute>} />
            <Route path="/ropa/documents" element={<SubscriberRoute><RopaDocuments /></SubscriberRoute>} />
            <Route path="/ropa/refresh/:sessionId" element={<SubscriberRoute><RopaRefresh /></SubscriberRoute>} />
            <Route path="/ropa-builder" element={<RopaLanding />} />
            <Route path="/rofa" element={<Navigate to="/ropa-builder" replace />} />
            <Route path="/ropa-builder/home" element={<Navigate to="/ropa-builder" replace />} />
            <Route path="/article-30" element={<Navigate to="/ropa-builder" replace />} />
            <Route path="/us-notices" element={<SubscriberRoute><USNoticeHome /></SubscriberRoute>} />
            <Route path="/us-notices/mode" element={<SubscriberRoute><USNoticeMode /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/mode" element={<SubscriberRoute><USNoticeMode /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/states" element={<SubscriberRoute><USNoticeStates /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/questions" element={<SubscriberRoute><USNoticeQuestions /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/review" element={<SubscriberRoute><USNoticeReview /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/documents" element={<SubscriberRoute><USNoticeDocuments /></SubscriberRoute>} />
            <Route path="/us-notices/:sessionId/refresh" element={<SubscriberRoute><USNoticeRefresh /></SubscriberRoute>} />
            {/* Legacy redirects (old order: step/sessionId) */}
            <Route path="/us-notices/states/:sessionId" element={<SubscriberRoute><USNoticeStates /></SubscriberRoute>} />
            <Route path="/us-notices/questions/:sessionId" element={<SubscriberRoute><USNoticeQuestions /></SubscriberRoute>} />
            <Route path="/us-notices/review/:sessionId" element={<SubscriberRoute><USNoticeReview /></SubscriberRoute>} />
            <Route path="/us-notices/review" element={<SubscriberRoute><USNoticeReview /></SubscriberRoute>} />
            <Route path="/us-notices/refresh/:sessionId" element={<SubscriberRoute><USNoticeRefresh /></SubscriberRoute>} />
            <Route path="/us-notice-builder" element={<USNoticeLanding />} />
            {/* EU & Global Notice Builder */}
            <Route path="/eu-notices" element={<SubscriberRoute><EUNoticeHome /></SubscriberRoute>} />
            <Route path="/eu-notices/mode" element={<SubscriberRoute><EUNoticeMode /></SubscriberRoute>} />
            <Route path="/eu-notices/frameworks/:sessionId" element={<SubscriberRoute><EUNoticeFrameworks /></SubscriberRoute>} />
            <Route path="/eu-notices/questions/:sessionId" element={<SubscriberRoute><EUNoticeQuestions /></SubscriberRoute>} />
            <Route path="/eu-notices/review/:sessionId" element={<SubscriberRoute><EUNoticeReview /></SubscriberRoute>} />
            <Route path="/eu-notices/review" element={<SubscriberRoute><EUNoticeReview /></SubscriberRoute>} />
            <Route path="/eu-notices/documents" element={<SubscriberRoute><EUNoticeDocuments /></SubscriberRoute>} />
            <Route path="/eu-notices/refresh/:sessionId" element={<SubscriberRoute><EUNoticeRefresh /></SubscriberRoute>} />
            <Route path="/eu-global-notice-builder" element={<EUNoticeLanding />} />
            <Route path="/eu-notice-builder" element={<Navigate to="/eu-global-notice-builder" replace />} />
            <Route path="/registration-manager" element={<RegistrationLanding />} />
            <Route path="/registration-manager/start" element={<RegistrationAssessment />} />
            <Route path="/registration-manager/result/:token" element={<RegistrationAssessmentResult />} />
            <Route
              path="/registration-manager/order/:id"
              element={
                <ProtectedRoute>
                  <RegistrationOrder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registration-manager/documents/:id"
              element={
                <ProtectedRoute>
                  <RegistrationDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/registration-manager/my-filings"
              element={
                <ProtectedRoute>
                  <RegistrationMyFilings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/watchlist"
              element={
                <ProtectedRoute>
                  <Watchlist />
                </ProtectedRoute>
              }
            />
            <Route path="/updates" element={<Updates />} />
            <Route path="/updates/:id" element={<UpdateDetail />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/laws" element={<Navigate to="/gdpr-enforcement" replace />} />
            <Route path="/assessments" element={<Navigate to="/tools" replace />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/sample-brief" element={<Navigate to="/#brief" replace />} />
            <Route path="/ropa-initial/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/ropa/review" /></ProtectedRoute>
            } />
            <Route path="/ropa-refresh/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/ropa/review" /></ProtectedRoute>
            } />
            <Route path="/us-notice-single/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/us-notices/review" /></ProtectedRoute>
            } />
            <Route path="/us-notice-all-states/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/us-notices/review" /></ProtectedRoute>
            } />
            <Route path="/eu-notice-single/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/eu-notices/review" /></ProtectedRoute>
            } />
            <Route path="/eu-notice-suite/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/eu-notices/review" /></ProtectedRoute>
            } />
            <Route path="/eu-notice-full-international/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/eu-notices/review" /></ProtectedRoute>
            } />
            <Route path="/eu-notice-refresh/result/:id" element={
              <ProtectedRoute><PaymentReturnRedirect to="/eu-notices/review" /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
