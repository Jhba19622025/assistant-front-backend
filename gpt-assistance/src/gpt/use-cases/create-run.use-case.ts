import OpenAI from "openai";

interface Options {
    threadId: string;
    assistantId?: string;
}

export const createRunUseCase = async (openai: OpenAI, options: Options) => {

    const envAssistant = (process.env.ASSISTANCE_ID || "").trim();
    const assistantId = (options.assistantId || envAssistant).trim();

    // if (!options.threadId) {
    //     throw new Error("threadId is required");
    // }
    
    if (!assistantId) {
        throw new Error("ASSISTANCE_ID is missing (pass options.assistantId o configura process.env.ASSISTANCE_ID)");
    }

    // const { threadId, assistantId = process.env.ASSISTANCE_ID} = options;

    const run = await openai.beta.threads.runs.create(options.threadId, {
        assistant_id: assistantId,
        // instructions; // OJO, sobrescribe el asistente
        // models?
    });

    console.log(run);
    return run;

}