import type { MfaPolicyStatus } from "@/types";
import { invokeRpc } from "./service-utils";

export const securityService = {
  mfaPolicyStatus(): Promise<MfaPolicyStatus> {
    return invokeRpc<MfaPolicyStatus>("api_mfa_policy_status");
  },
};
