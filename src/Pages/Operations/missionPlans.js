const task = (key, title, prompt, after = [], options = {}) => ({ key, title, prompt, after, profile: "read-only", ...options });
const after = (step, result = "pass") => [{ step, result }];

export const horizonGrant = {
  title: "HORIZON hosted grant verification",
  workspace: "development",
  completionStep: "close",
  steps: [
    task("dispatch", "Verify a disposable read-only dispatch",
      "Return evidence that this disposable HORIZON grant dispatched a Read Only turn. Report this turn only. Use no tools and make no changes. End with MISSION_RESULT: PASS.",
      [], { requires: ["read"] }),
    task("close", "Record the grant verification result",
      "Use the previous step result in the mission context to confirm whether the disposable dispatch passed. Use no tools and make no changes. End with MISSION_RESULT: PASS if the dispatch passed, otherwise MISSION_RESULT: BLOCKED.",
      after("dispatch"), { requires: ["read"] }),
  ],
};
export function missionPlan(template, reviewer, profile) {
  if (template === "acceptance") return [
    task("baseline", "Inspect FOUNDRY release evidence",
      "Read docs/foundry/requirements.md and inspect the deployed Operations health and private-access boundary using read-only checks. Identify one specific follow-up, its evidence and any blind spots."),
    task("review", "Independently review the readiness finding",
      "Check the preceding finding against the FOUNDRY register and current hosted evidence. Return CORRECT for a concrete deficiency, or PASS if the evidence supports the finding.", after("baseline"), { reviewer }),
    task("correct", "Correct the readiness finding",
      "Correct the specific deficiency identified by independent review. Verify the new claim with read-only evidence and describe the remaining decision.", after("review", "correct")),
    task("retest", "Independently retest the correction",
      "Compare the corrected finding with the original criteria and evidence. Report any unresolved discrepancy.", after("correct"), { reviewer }),
    task("handoff", "Prepare the next FOUNDRY assignment",
      "Use the independently verified finding to propose the smallest actionable implementation and precise acceptance criteria.", after("review")),
    task("verify-plan", "Verify the proposed FOUNDRY assignment",
      "Independently check whether the proposed scope and observable criteria address the readiness evidence. List any remaining owner decision. Report PASS only when the proposed assignment is actionable.", after("handoff"), { reviewer }),
    task("gate", "Record the hosted acceptance evidence",
      "Summarize the recorded baseline, review and verified next assignment. Keep the owner's acceptance separate.", after("verify-plan"), { approval: true }),
    task("corrected-gate", "Record the corrected hosted acceptance evidence",
      "Summarize the correction and independent retest, with reproducible evidence. Keep the owner's acceptance separate.", after("retest"), { approval: true }),
  ];
  return [
    task("blueprint", "Run the Blueprint artifact-to-approval sequence",
      "Use the FOUNDRY register and the existing Blueprint runner. Work on a disposable artifact, review, correction and retest sequence. Preserve the owner gate and report unavailable hosted capabilities.", [], { profile }),
    task("blueprint-review", "Independently verify Blueprint evidence",
      "Review the preceding evidence against the real artifact, review, correction, retest and approval requirements. Report exactly what was verified.", after("blueprint"), { reviewer }),
    task("artifacts", "Improve Artifact organization and thumbnails",
      "Consult the FOUNDRY register and current implementation. Deliver the smallest authorized next increment for virtual folders or real thumbnails, with private-access and browser evidence.", [], { profile }),
    task("artifact-review", "Independently verify the Artifact increment",
      "Check the prior increment for authorization, metadata accuracy and preservation of source files.", after("artifacts"), { reviewer }),
    task("operations", "Close an Operations workflow gap",
      "Consult the FOUNDRY requirements register. Choose the highest-value unblocked Operations workspace gap. Deliver an independently reviewable increment or record the exact blocker.", [], { profile }),
    task("ui-direction", "Prepare original Operations UI directions",
      "Review Crossworld identity and acceptance criteria. Propose original directions and experimental production needs. Preserve production art approval.", [], { reviewer }),
    task("game-research", "Compare headquarters rendering and asset pipelines",
      "Review the Office, Workshop and FOUNDRY register. Define comparable rendering experiments and a reproducible tile, character and animation pipeline."),
    task("game-slice", "Prepare the integrated headquarters vertical slice",
      "Use the research and design direction to prepare the smallest integrated room, character, navigation and live state slice. Preserve production art and platform readiness gates.",
      [...after("game-research"), ...after("ui-direction")], { profile, approval: true }),
  ];
}
