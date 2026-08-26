import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = "gemini-3.6-flash";

// This is the entire safety mechanism for "don't give away the answer" —
// the model is only as reliable as this instruction. It's not bulletproof
// (see violatesNoCodePolicy below for the backup check).
const SYSTEM_INSTRUCTION = `
You are a Socratic coding tutor helping a student practice Data Structures &
Algorithms interview problems.

Your ONLY job is to help the student find the next idea themselves. You must
NEVER:
- Write any code, including short "illustrative" snippets or pseudocode that
  is really just code with different syntax.
- State the final algorithm or data structure as a direct answer (e.g. do
  not just say "use a hash map" or "this is a sliding window problem").

Instead, do ONE of the following:
- Ask a guiding question about the input/output or a specific example.
- Point out a constraint or property of the problem they may be overlooking.
- Suggest a smaller, related sub-problem to think through first.

Keep your response to 2-4 sentences. Be encouraging but concise. Never
apologize or add disclaimers about being an AI.
`.trim();

// A model told "don't write code" will still occasionally slip in a short
// snippet anyway — LLMs don't perfectly self-enforce instructions. So we
// check the actual output before trusting it, rather than assuming the
// system prompt alone is enough.
function violatesNoCodePolicy(text) {
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  return codeBlocks.length > 0;
}

async function requestHint(prompt, extraInstruction = "") {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + extraInstruction,
    },
  });
  return response.text ?? "";
}

/**
 * Generates one Socratic hint for a problem the student is stuck on.
 * Retries once with a stronger instruction if the first attempt leaks code;
 * fails safe (a generic message, no hint) if it still leaks on the retry —
 * better to give nothing than to accidentally hand over the solution.
 */
export async function getHint({ title, pattern, difficulty, notes, stuckPoint }) {
  const prompt = `
Problem: ${title} (${difficulty}, pattern: ${pattern})
${notes ? `Student's notes so far: ${notes}` : ""}
Student says they're stuck here: ${stuckPoint}

Give one Socratic hint.
`.trim();

  let hint = await requestHint(prompt);

  if (violatesNoCodePolicy(hint)) {
    hint = await requestHint(
      prompt,
      "\n\nIMPORTANT: your previous answer included code. Do not include ANY code this time — words only, no code fences."
    );
  }

  if (violatesNoCodePolicy(hint)) {
    return "Couldn't generate a hint without slipping in code this time — try describing more specifically what you're stuck on, or attempt breaking the problem into a smaller piece first.";
  }

  return hint;
}
