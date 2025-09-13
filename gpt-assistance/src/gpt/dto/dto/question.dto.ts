import { IsString } from "class-validator";

export class QuestionDto {

    @IsString()
    threadId: string;

    @IsString()
    readonly question: string;
}
