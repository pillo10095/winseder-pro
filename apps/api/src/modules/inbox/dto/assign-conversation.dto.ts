import { IsNotEmpty, IsString } from 'class-validator';

export class AssignConversationDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;
}
