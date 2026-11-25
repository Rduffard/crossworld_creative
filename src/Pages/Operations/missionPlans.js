const task = (key, title, prompt, after = [], options = {}) => ({ key, title, prompt, after, profile: "read-only", ...options });
const after = (step, result = "pass") => [{ step, result }];

export const horizonGrant = {
  title: "HORIZON- Hosted Increment 1",
  workspace: "development",
  delegatePlanning: true,
  completionStep: "close",
  steps: [
    task("implementation", "Forge implements guided mission grant preparation",
      "Implement guided Operations mission grant preparation for the approved HORIZON Blueprint. Let the owner review scope and grant once without transferring raw JSON. Reuse the existing grant route, preserve locks and approval gates, and run focused practical UI verification. Edit only Operations development repositories. Record the repository, working tree revision, tests and limitations. Obtain explicit owner authorization before committing and report the exact candidate commit. Do not push before independent review or promote production assets.",
      [], { assignee: "add4559f-de4c-4f80-acf1-04aac7f8a1a8", profile: "full-access", requires: ["read", "write"] }),
    task("coordinate", "First Mate records evidence and commissions exact review",
      "Resolve the exact candidate repository and full commit from the implementation evidence. Use coordinate_studio_mission to add an eligible independent read-only review bound to that candidate. Add review PASS as a dependency of close and retain existing dependencies. Record the revision receipt. Report BLOCKED if the evidence or revision capability is unavailable.",
      after("implementation"), { requires: ["read"] }),
    task("close", "First Mate verifies the increment and records next work",
      "Confirm the exact implementation candidate and independent review outcome from controller records. Record outstanding corrections and the next approved HORIZON work. Report PASS only with implementation and independent review evidence. Preserve separate owner acceptance and release gates.",
      after("coordinate"), { requires: ["read"] }),
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
