import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { getModel } from "../../utilities/modelHelpers.js";

/**
 * Zod schema defining the structure for a pull request summary.
 * This includes a suggested title, type, description, and categorized changes.
 */
export const PrSummarySchema = z.object({
  pr_type: z.enum([
    "Feature",
    "Bugfix",
    "Refactor",
    "Test",
    "Documentation",
    "Chore",
    "Style"
  ]).describe(
    "The primary classification that best describes the overall nature of the PR."
  ),

  description: z.array(z.string())
    .min(1, "Provide at least one summary point.")
    .max(5, "Keep the summary concise (max 5 points).")
    .describe(
      "A list of 1-5 bullet points summarising the most significant key changes made in the PR. Focus on what was changed and why."
    ),

  changes: z.object({
    enhancements: z.array(z.object({
      fileName: z.string().describe("The full path of the file where the enhancement was made."),
      summary: z.string().describe("A concise summary of the enhancement implemented in this file.")
    }))
    .optional()
    .describe("A list of significant enhancements or new features added/modified."),

    tests: z.array(z.object({
      fileName: z.string().describe("The full path of the file where tests were added or updated."),
      summary: z.string().describe("A concise summary of the changes made to tests in this file.")
    }))
    .optional()
    .describe("A list of test files added or modified."),

    config: z.array(z.object({
      fileName: z.string().describe("The full path of the file where configuration changes were made."),
      summary: z.string().describe("A concise summary of the configuration changes in this file.")
    }))
    .optional()
    .describe("A list of configuration changes made (e.g., dependencies, settings, CI/CD)."),

    bugfixes: z.array(z.object({
        fileName: z.string().describe("The full path of the file where a bug was fixed."),
        summary: z.string().describe("A concise summary of the bug fix implemented in this file.")
    }))
    .optional()
    .describe("A list of specific bug fixes implemented."),

  }).describe(
    "A categorised summary of specific changes made in different files within the PR."
  ),
});

/**
 * TypeScript type inferred from the PrSummarySchema, representing a structured PR summary.
 */
export type PrSummary = z.infer<typeof PrSummarySchema>;

/** Instructions guiding the PR Summary Agent's behaviour. */
const instructions = `You are an AI assistant specialising in analysing Git pull request diffs and generating concise, informative summaries according to the provided JSON schema.

**Analysis Guidelines:**
*   **Source of Truth:** Your summary MUST be based *exclusively* on the code additions and modifications (\`+\` lines) visible in the **Git Diff** provided below. Do NOT infer or report changes in files not present in the diff.
*   **Context for Interpretation:** Use the **Jira Context** and **Commit Messages** ONLY to understand the *purpose* or *reason* behind the changes *you see in the diff*. This context helps determine the 'pr_type' and explain *why* the *visible code changes* were made.
*   **Summarize Visible Changes:** Focus solely on lines starting with '+' in the diff. Your 'description' points (key changes) and 'changes' breakdown must directly reflect these additions/modifications.
*   **Key Changes Focus:** For the 'description' bullet points (key changes), focus on the *impact* and *purpose* of the changes reflected in the diff, informed by context. Highlight significant additions, removals, or modifications to functionality or logic.
*   **Edge Cases:** If the provided diff contains no significant code changes (e.g., only documentation, comments, minor whitespace, or is empty after filtering), explicitly state this and simplify the summary accordingly (e.g., indicate "No code changes to summarize").
*   Group related changes logically.
*   Identify the primary type of the PR (Feature, Bugfix, Refactor, etc.) based on the overall goal suggested by the context and realised in the diff.

**Negative Constraints:**
*   **CRITICAL:** Do NOT mention any file or change if it is NOT explicitly present in the provided diff (+ lines), regardless of context (Jira/Commits). Stick strictly to the diff content.
*   Do NOT list every single file that was modified unless they are all significant. Focus on the most impactful changes reflected in the diff.
*   Do NOT simply repeat commit messages verbatim. Provide a synthesised summary informed by them.
*   Do NOT include minor changes like whitespace, formatting, or trivial comment updates unless they significantly alter logic or understanding.
*   Do NOT summarise based *only* on the Jira ticket or commit messages if the diff doesn't reflect those changes. The summary must be grounded in the actual code modifications.
*   Do NOT include empty arrays for categories in the "changes" object if there are no relevant changes for that category. Omit the key entirely if empty.`;

/**
 * Mastra Agent specifically configured to analyse pull request diffs and generate summaries.
 * It uses the defined instructions and schema to produce structured summary information.
 */
export const prSummaryAgent = new Agent({
  name: "prSummariser",
  instructions: instructions,
  model: getModel()
});