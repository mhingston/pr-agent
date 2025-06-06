import { PrReview } from "../mastra/agents/prReviewerAgent.js";
import { PrSummary } from "../mastra/agents/prSummaryAgent.js"

/**
 * Formats a PR review object into a Markdown string suitable for posting as a comment.
 * @param review - The PR review object generated by the reviewer agent.
 * @returns A Markdown formatted string representing the review.
 */
export function formatReviewToMarkdown(review: PrReview): string {
  let markdown = `## PR Review 🧐\n\n`;
  markdown += `**Overall Assessment:** ${review.overall_assessment}\n\n`;
  markdown += `**Review Effort:** ${review.review_effort}\n\n`;
  
  // Add reasoning if present
  if (review.review_effort_reasoning) {
      markdown += `*Justification:* ${review.review_effort_reasoning}\n\n`;
  }

  if (review.feedback_points && review.feedback_points.length > 0) {
    markdown += `**Potential Issues & Suggestions:**\n\n`;
    review.feedback_points.forEach(point => {
      markdown += `- **[${point.severity || "Info"}]** ${point.description} `;
      markdown += `(_File:_ \`${point.file_path}\`${point.line_reference ? `, _Around:_ ${point.line_reference}` : ""})\n`;

      if (point.suggested_code_change) {
        const lang = point.file_path.split(".").pop()?.toLowerCase() || "";
        // Indent the code block by 4 spaces for proper Markdown list nesting.
        // Ensure the suggested code itself maintains relative indentation.
        const indentedSuggestion = point.suggested_code_change.split("\n").map(line => line ? `    ${line}` : "").join("\n");
        markdown += `    \`\`\`${lang}\n${indentedSuggestion}\n    \`\`\`\n`;
      }
      markdown += `\n`; // Add a newline after each feedback point for spacing
    });
  } else {
    markdown += `**Potential Issues & Suggestions:** None found.\n\n`;
  }

  markdown += `**Security Concerns:**\n\n`;
  if (review.security_concerns && review.security_concerns.length > 0) {
    review.security_concerns.forEach(concern => {
      markdown += `- ${concern}\n`;
    });
  } else {
    markdown += `- No major security concerns identified.\n`;
  }
  markdown += `\n`;

  if (review.test_coverage_assessment) {
    markdown += `**Test Coverage Assessment:** ${review.test_coverage_assessment}\n`;
  }

  return markdown.trim();
}


/**
 * Formats a PR summary object into a Markdown string suitable for updating the PR description.
 * @param summary - The PR summary object generated by the summary agent.
 * @returns A Markdown formatted string representing the summary.
 */
export function formatSummaryToMarkdown(summary: PrSummary): string {
  let markdown = `**Type:** ${summary.pr_type}\n\n`;
  markdown += `**Key Changes:**\n`;
  summary.description.forEach(point => {
    markdown += `- ${point}\n`;
  });
  markdown += `\n`;

  let changesExist = false;
  let changesMd = "---\n\n";

  /**
   * Helper function to add a formatted category section to the changes Markdown.
   * Modifies `changesExist` and `changesMd` in the outer scope.
   * @param title - The title of the category (e.g., "Enhancements").
   * @param items - An array of file change objects for the category.
   */
  const addCategory = (title: string, items: { fileName: string, summary: string }[] | undefined) => {
      if (items && items.length > 0) {
          changesExist = true;
          changesMd += `**${title}:**\n`;
          items.forEach(item => {
              changesMd += `- \`${item.fileName}\`: ${item.summary}\n`;
          });
          changesMd += `\n`;
      }
  };

  addCategory("Enhancements", summary.changes.enhancements);
  addCategory("Bug Fixes", summary.changes.bugfixes);
  addCategory("Tests", summary.changes.tests);
  addCategory("Configuration", summary.changes.config);
  if (changesExist) {
      markdown += changesMd;
  }

  return markdown.trim();
}


/**
 * Truncates a diff string safely, ensuring that the cut happens between
 * files (`diff --git`) or hunks (`@@ ... @@`), not within them, if possible.
 * Falls back to truncating at the last newline if no safe boundary is found
 * within the character limit.
 *
 * @param diff The original diff string.
 * @param maxLength The maximum desired character length for the truncated diff.
 * @returns An object containing the truncated diff and a boolean indicating if truncation occurred.
 */
export function truncateDiffSafely(diff: string, maxLength: number): { truncatedDiff: string; wasTruncated: boolean } {
  if (diff.length <= maxLength) {
    return { truncatedDiff: diff, wasTruncated: false };
  }

  let truncatedDiff = diff.substring(0, maxLength);
  let wasTruncated = true;

  // Find the last hunk boundary (`\n@@ `) before the maxLength
  const lastHunkBoundary = truncatedDiff.lastIndexOf("\n@@ ");
  // Find the last file boundary (`\ndiff --git`) before the maxLength
  const lastFileBoundary = truncatedDiff.lastIndexOf("\ndiff --git");

  // Find the latest boundary (either hunk or file)
  const lastBoundary = Math.max(lastHunkBoundary, lastFileBoundary);

  if (lastBoundary !== -1) {
    // Truncate at the beginning of the boundary line
    truncatedDiff = diff.substring(0, lastBoundary);
  } else {
    // Fallback: No boundary found before maxLength.
    // Try truncating at the last newline to avoid cutting mid-line.
    const lastNewline = truncatedDiff.lastIndexOf("\n");
    if (lastNewline !== -1) {
      truncatedDiff = truncatedDiff.substring(0, lastNewline);
    }
    // If no newline is found either, the hard substring cut at maxLength remains.
  }

   truncatedDiff += "\n\n[Diff truncated due to length limit]";

  return { truncatedDiff, wasTruncated };
}