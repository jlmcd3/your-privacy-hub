import { Suspense, lazy } from "react";
const GlobeScene = lazy(() => import("./GlobeScene"));

const RegulatorGlobe = () => (
  <div
    style={{
      position: "absolute",
      right: "-5%",
      top: "50%",
      transform: "translateY(-50%)",
      width: "65%",
      opacity: 1,
    }}
  >
    <Suspense fallback={null}>
      <GlobeScene />
    </Suspense>
  </div>
);

export default RegulatorGlobe;
