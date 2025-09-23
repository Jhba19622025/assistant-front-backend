import OpenAI from "openai";

interface Options {
    threadId: string;
    assistantId?: string;
}

export const createRunUseCase = async (openai: OpenAI, options: Options) => {

    const { threadId, assistantId = process.env.ASSISTANCE_ID} = options;

    const run = openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
        // instructions; // OJO, sobrescribe el asistente
        // models?
    });

    console.log(run);
    return run;

}