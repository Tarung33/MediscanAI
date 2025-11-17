import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePatientSummary(patientHistory: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant. Summarize patient medical histories concisely, highlighting key diagnoses, treatments, risk factors, and recommendations. Format your response with clear sections: Chief Complaints, Diagnoses, Treatments, and Recommendations."
        },
        {
          role: "user",
          content: `Summarize this patient's medical history:\n\n${patientHistory}`
        }
      ],
      max_completion_tokens: 2048,
    });

    return response.choices[0].message.content || "Unable to generate summary";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error("Failed to generate AI summary");
  }
}
