#!/usr/bin/env node

import { rmSync } from "node:fs";

await import("./validate-environment.mjs");

// Somente artefatos gerados pelo runner são removidos; código-fonte e banco
// remoto nunca fazem parte da limpeza.
rmSync("artifacts/validation", { recursive: true, force: true });
console.log("VALIDATION_ARTIFACTS_CLEANED");
