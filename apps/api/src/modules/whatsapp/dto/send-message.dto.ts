import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { MessageType } from '../entities/message.entity';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  conversation_id?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
