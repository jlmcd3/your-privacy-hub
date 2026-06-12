import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";

const GlobalAuthorities = lazy(() => import("./pages/GlobalAuthorities.tsx"));
const USPrivacyLaws = lazy(() => import("./pages/USPrivacyLaws.tsx"));
const USStateLawPage = lazy(() => import("./pages/USStateLawPage.tsx"));
const GDPREnforcement = lazy(() => import("./pages/GDPREnforcement.tsx"));
const AIPrivacyRegulations = lazy(() => import("./pages/AIPrivacyRegulations.tsx"));
const GlobalPrivacyLaws = lazy(() => import("./pages/GlobalPrivacyLaws.tsx"));
const JurisdictionPage = lazy(() => import("./pages/JurisdictionPage.tsx"));
const RegulatorPage = lazy(() => import("./pages/RegulatorPage.tsx"));
const CategoryPage = lazy(() => import("./pages/CategoryPage.tsx"));
const TopicHub = lazy(() => import("./pages/TopicHub.tsx"));
const Glossary = lazy(() => import("./pages/Glossary.tsx"));
const GlossaryTerm = lazy(() => import("./pages/GlossaryTerm.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));
const Timelines = lazy(() => import("./pages/Timelines.tsx"));
const TimelineDetail = lazy(() => import("./pages/TimelineDetail.tsx"));
const USStateComparison = lazy(() => import("./pages/USStateComparison.tsx"));
const Signup = lazy(() => import("./pages/Signup.tsx"));
import Login from "./pages/Login.tsx";
const Account = lazy(() => import("./pages/Account.tsx"));
const ClientsPortfolio = lazy(() => import("./pages/ClientsPortfolio.tsx"));
const RopaHome = lazy(() => import("./pages/ropa/RopaHome.tsx"));
const RopaSetup = lazy(() => import("./pages/ropa/RopaSetup.tsx"));
const RopaActivities = lazy(() => import("./pages/ropa/RopaActivities.tsx"));
const RopaActivity = lazy(() => import("./pages/ropa/RopaActivity.tsx"));
const RopaReview = lazy(() => import("./pages/ropa/RopaReview.tsx"));
const RopaDocuments = lazy(() => import("./pages/ropa/RopaDocuments.tsx"));
const RopaRefresh = lazy(() => import("./pages/ropa/RopaRefresh.tsx"));
const RopaLanding = lazy(() => import("./pages/ropa/RopaLanding.tsx"));
const USNoticeHome = lazy(() => import("./pages/us-notices/USNoticeHome.tsx"));
const USNoticeMode = lazy(() => import("./pages/us-notices/USNoticeMode.tsx"));
const USNoticeStates = lazy(() => import("./pages/us-notices/USNoticeStates.tsx"));
const USNoticeQuestions = lazy(() => import("./pages/us-notices/USNoticeQuestions.tsx"));
const USNoticeReview = lazy(() => import("./pages/us-notices/USNoticeReview.tsx"));
const USNoticeDocuments = lazy(() => import("./pages/us-notices/USNoticeDocuments.tsx"));
const USNoticeRefresh = lazy(() => import("./pages/us-notices/USNoticeRefresh.tsx"));
const USNoticeLanding = lazy(() => import("./pages/us-notices/USNoticeLanding.tsx"));
const EUNoticeHome = lazy(() => import("./pages/eu-notices/EUNoticeHome.tsx"));
const EUNoticeMode = lazy(() => import("./pages/eu-notices/EUNoticeMode.tsx"));
const EUNoticeFrameworks = lazy(() => import("./pages/eu-notices/EUNoticeFrameworks.tsx"));
const EUNoticeQuestions = lazy(() => import("./pages/eu-notices/EUNoticeQuestions.tsx"));
const EUNoticeReview = lazy(() => import("./pages/eu-notices/EUNoticeReview.tsx"));
const EUNoticeDocuments = lazy(() => import("./pages/eu-notices/EUNoticeDocuments.tsx"));
const EUNoticeRefresh = lazy(() => import("./pages/eu-notices/EUNoticeRefresh.tsx"));
const EUNoticeLanding = lazy(() => import("./pages/eu-notices/EUNoticeLanding.tsx"));
const NoticesRopaHub = lazy(() => import("./pages/NoticesRopaHub.tsx"));
const NoticeBuilderLanding = lazy(() => import("./pages/NoticeBuilderLanding.tsx"));
import Dashboard from "./pages/Dashboard.tsx";
const Obligations = lazy(() => import("./pages/Obligations.tsx"));
const Subscribe = lazy(() => import("./pages/Subscribe.tsx"));
const SubscribeSuccess = lazy(() => import("./pages/SubscribeSuccess.tsx"));
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import SubscriberRoute from "./components/SubscriberRoute.tsx";
import CanonicalTag from "./components/CanonicalTag.tsx";
const CronStatus = lazy(() => import("./pages/admin/CronStatus"));
const AdminSubscribers = lazy(() => import("./pages/admin/AdminSubscribers"));
const ResponsivePreview = lazy(() => import("./pages/admin/ResponsivePreview"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy.tsx"));
import Updates from "./pages/Updates.tsx";
import UpdateDetail from "./pages/UpdateDetail.tsx";
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const LogoPreview = lazy(() => import("./pages/LogoPreview.tsx"));
import DevOnly from "./components/DevOnly.tsx";
import AdminOnly from "./components/AdminOnly.tsx";
const About = lazy(() => import("./pages/About.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
import ScrollToTop from "./components/ScrollToTop.tsx";
import ScrollToTopButton from "./components/ScrollToTopButton.tsx";
import { PaymentTestModeBanner } from "./components/PaymentTestModeBanner.tsx";
import BlankScreenDiagnostic from "./components/BlankScreenDiagnostic.tsx";
const JurisdictionsHub = lazy(() => import("./pages/JurisdictionsHub.tsx"));
const LegislationTracker = lazy(() => import("./pages/LegislationTracker.tsx"));
const BriefPreferences = lazy(() => import("./pages/BriefPreferences.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const CheckEmail = lazy(() => import("./pages/CheckEmail.tsx"));
const OnboardingProfile = lazy(() => import("./pages/OnboardingProfile.tsx"));
const Tools = lazy(() => import("./pages/Tools.tsx"));
const StartNew = lazy(() => import("./pages/StartNew.tsx"));
const CookieConsent = lazy(() => import("./pages/CookieConsent.tsx"));
const HealthDataPrivacy = lazy(() => import("./pages/HealthDataPrivacy.tsx"));
const BiometricPrivacy = lazy(() => import("./pages/BiometricPrivacy.tsx"));
const BreachNotification = lazy(() => import("./pages/BreachNotification.tsx"));
const CrossBorderTransfers = lazy(() => import("./pages/CrossBorderTransfers.tsx"));
const GetIntelligence = lazy(() => import("./pages/GetIntelligence.tsx"));
const LegitimateInterestTracker = lazy(() => import("./pages/LegitimateInterestTracker.tsx"));
const AdminSeedLI = lazy(() => import("./pages/AdminSeedLI.tsx"));
const AdminIngestionDashboard = lazy(() => import("./pages/AdminIngestionDashboard.tsx"));
const AdminIngestLegislation = lazy(() => import("./pages/AdminIngestLegislation.tsx"));
const AdminJurisdictionAudit = lazy(() => import("./pages/admin/AdminJurisdictionAudit.tsx"));
const AdminArticles = lazy(() => import("./pages/AdminArticles.tsx"));
const AdminEmailSignups = lazy(() => import("./pages/AdminEmailSignups.tsx"));
const AdminGatingLeaks = lazy(() => import("./pages/AdminGatingLeaks.tsx"));
const AdminBriefGenStatus = lazy(() => import("./pages/AdminBriefGenStatus.tsx"));
const AdminPricingReconciliation = lazy(() => import("./pages/AdminPricingReconciliation.tsx"));
const AdminLawUpdates = lazy(() => import("./pages/AdminLawUpdates.tsx"));
const AdminStateLawReview = lazy(() => import("./pages/AdminStateLawReview.tsx"));
const AdminTrialUsers = lazy(() => import("./pages/AdminTrialUsers.tsx"));
const LIAssessment = lazy(() => import("./pages/LIAssessment.tsx"));
const LIAssessmentIntake = lazy(() => import("./pages/LIAssessmentIntake.tsx"));
const LIAssessmentResult = lazy(() => import("./pages/LIAssessmentResult.tsx"));
const GovernanceAssessment = lazy(() => import("./pages/GovernanceAssessment.tsx"));
const GovernanceAssessmentResult = lazy(() => import("./pages/GovernanceAssessmentResult.tsx"));
const DPIAFramework = lazy(() => import("./pages/DPIAFramework.tsx"));
const DPIAFrameworkResult = lazy(() => import("./pages/DPIAFrameworkResult.tsx"));
const Enforcement = lazy(() => import("./pages/Enforcement.tsx"));
const EnforcementActionDetail = lazy(() => import("./pages/EnforcementActionDetail.tsx"));
const DPAGenerator = lazy(() => import("./pages/DPAGenerator.tsx"));
const IRPlaybook = lazy(() => import("./pages/IRPlaybook.tsx"));
const BiometricChecker = lazy(() => import("./pages/BiometricChecker.tsx"));
const Horizon = lazy(() => import("./pages/Horizon.tsx"));
const RegistrationLanding = lazy(() => import("./pages/RegistrationLanding.tsx"));
const RegistrationAssessment = lazy(() => import("./pages/RegistrationAssessment.tsx"));
const RegistrationAssessmentResult = lazy(() => import("./pages/RegistrationAssessmentResult.tsx"));
const RegistrationOrder = lazy(() => import("./pages/RegistrationOrder.tsx"));
const RegistrationDocuments = lazy(() => import("./pages/RegistrationDocuments.tsx"));
const RegistrationMyFilings = lazy(() => import("./pages/RegistrationMyFilings.tsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.tsx"));
const MyReports = lazy(() => import("./pages/MyReports.tsx"));
const AccountCPPARuns = lazy(() => import("./pages/AccountCPPARuns.tsx"));
const CPPAHub = lazy(() => import("./pages/CPPAHub.tsx"));
const AdminCPPARuns = lazy(() => import("./pages/AdminCPPARuns.tsx"));
const DPAResult = lazy(() => import("./pages/DPAResult.tsx"));
const IRPlaybookResult = lazy(() => import("./pages/IRPlaybookResult.tsx"));
const BiometricCheckerResult = lazy(() => import("./pages/BiometricCheckerResult.tsx"));
const CPPAScopeChecker = lazy(() => import("./pages/CPPAScopeChecker.tsx"));
const CPPARiskAssessment = lazy(() => import("./pages/CPPARiskAssessment.tsx"));
const CPPARiskAssessmentResult = lazy(() => import("./pages/CPPARiskAssessmentResult.tsx"));
const CPPACybersecurity = lazy(() => import("./pages/CPPACybersecurity.tsx"));
const CPPACybersecurityResult = lazy(() => import("./pages/CPPACybersecurityResult.tsx"));
const CPPACybersecurityDrift = lazy(() => import("./pages/CPPACybersecurityDrift.tsx"));
const CPPASuiteResult = lazy(() => import("./pages/CPPASuiteResult.tsx"));
const CPPAAdmtPlaceholder = lazy(() => import("./pages/CPPAAdmtPlaceholder.tsx"));
const TestsDashboard = lazy(() => import("./pages/admin/TestsDashboard.tsx"));
const TestsOutput = lazy(() => import("./pages/admin/TestsOutput.tsx"));
const TestsRealWorld = lazy(() => import("./pages/admin/TestsRealWorld.tsx"));
const CorpusExtractionAdmin = lazy(() => import("./pages/admin/CorpusExtractionAdmin"));
const VerificationScanAdmin = lazy(() => import("./pages/admin/VerificationScanAdmin"));
const PrimarySourceFetcher = lazy(() => import("./pages/admin/PrimarySourceFetcher"));
const CPPACorpusAdmin = lazy(() => import("./pages/admin/CPPACorpusAdmin"));
const CPPAEvalHarness = lazy(() => import("./pages/admin/CPPAEvalHarness"));
const AdminFsorIngestion = lazy(() => import("./pages/admin/AdminFsorIngestion"));
const AdminSampleReports = lazy(() => import("./pages/admin/AdminSampleReports"));
const SampleReport = lazy(() => import("./pages/SampleReport.tsx"));
const SampleReportOutput = lazy(() => import("./pages/SampleReportOutput.tsx"));
const TestsGdprDocs = lazy(() => import("./pages/admin/TestsGdprDocs"));
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
          <Suspense fallback={<div style={{padding:"4rem",textAlign:"center",color:"#64748b",fontSize:"14px"}}>Loading…</div>}>
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
            <Route path="/us-privacy-laws/:slug" element={<USStateLawPage />} />
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
              path="/obligations"
              element={
                <ProtectedRoute>
                  <Obligations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/cppa-runs"
              element={
                <ProtectedRoute>
                  <AccountCPPARuns />
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
              path="/admin/ingest-legislation"
              element={
                <ProtectedRoute>
                  <AdminIngestLegislation />
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
              path="/admin/pricing-reconciliation"
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
              path="/admin/state-law-review"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminStateLawReview />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/trial-users"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminTrialUsers />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/cppa-runs"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminCPPARuns />
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
              path="/admin/fsor-ingestion"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminFsorIngestion />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sample-reports"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <AdminSampleReports />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />

            <Route path="/samples/report-output" element={<SampleReportOutput />} />
            <Route path="/samples/:toolSlug" element={<SampleReport />} />


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
            <Route
              path="/admin/tests-realworld"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestsRealWorld />
                  </AdminOnly>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/tests-gdprdocs"
              element={
                <ProtectedRoute>
                  <AdminOnly fallback={<NotFound />}>
                    <TestsGdprDocs />
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
            <Route path="/cppa" element={<CPPAHub />} />
            <Route path="/cppa-scope-checker" element={<CPPAScopeChecker />} />
            <Route path="/cppa-admt" element={<CPPAAdmtPlaceholder />} />
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
              path="/cppa-cybersecurity/drift/:newId/:oldId"
              element={
                <ProtectedRoute>
                  <CPPACybersecurityDrift />
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
            <Route path="/eu-notice-builder" element={<Navigate to="/notice-builder" replace />} />
            {/* Merged Notice Builder landing (D3) */}
            <Route path="/notice-builder" element={<NoticeBuilderLanding />} />
            <Route path="/notices" element={<Navigate to="/notice-builder" replace />} />
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
</Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
