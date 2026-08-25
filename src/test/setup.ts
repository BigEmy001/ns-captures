import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

/**
 * waitFor defaults to one second, which is comfortable on an idle machine and
 * marginal on a loaded one — the same component tests passed in isolation and
 * failed in the full parallel run. The extra headroom costs nothing when a
 * test passes and stops the suite reporting load as a regression.
 */
configure({ asyncUtilTimeout: 5000 });
