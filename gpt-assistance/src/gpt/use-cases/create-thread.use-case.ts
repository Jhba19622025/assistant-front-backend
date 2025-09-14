import OpenAI from "openai";


export const createThreadUseCase = async (openai: OpenAI) => {
    const thread = await openai.beta.threads.create();
    const { id } = thread;
    console.log(thread);
    if (thread.id === null) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await createThreadUseCase(openai);
    }
    return {
        id
    };
}

