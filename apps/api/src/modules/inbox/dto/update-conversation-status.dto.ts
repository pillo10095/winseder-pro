import { IsEnum, IsNotEmpty } from 'class-validator';

import { ConversationStatus } from '../../whatsapp/entities/conversation.entity';

export class UpdateConversationStatusDto {
  @IsEnum(ConversationStatus)
  @IsNotEmpty()
  status!: ConversationStatus;
}
