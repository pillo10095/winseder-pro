import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { CreateAiAgentDto, ChatDto, ClassifyDto, SuggestDto } from '../dto/ai-agent.dto';
import { AiAgentService } from '../services/ai-agent.service';
import { IntentClassifierService } from '../services/intent-classifier.service';
import { SuggestionService } from '../services/suggestion.service';
import { ConversationSummarizerService } from '../services/conversation-summarizer.service';
import { HotLeadDetectorService } from '../services/hot-lead-detector.service';
import { RagService } from '../services/rag.service';
import { AiLogRepository } from '../repositories/ai-log.repository';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiAgentController {
  constructor(
    private readonly agentService: AiAgentService,
    private readonly classifier: IntentClassifierService,
    private readonly suggestion: SuggestionService,
    private readonly summarizer: ConversationSummarizerService,
    private readonly hotLeadDetector: HotLeadDetectorService,
    private readonly ragService: RagService,
    private readonly logRepo: AiLogRepository,
  ) {}

  @Get('agent')
  async getAgent(@CompanyId() companyId: string) {
    const agent = await this.agentService.getOrCreate(companyId);
    return { data: agent };
  }

  @Put('agent')
  async updateAgent(
    @CompanyId() companyId: string,
    @Body() dto: CreateAiAgentDto,
  ) {
    const agent = await this.agentService.update(companyId, dto);
    return { data: agent };
  }

  @Post('chat')
  async chat(
    @CompanyId() companyId: string,
    @Body() dto: ChatDto,
  ) {
    const result = await this.agentService.chat(
      companyId,
      dto.message,
      dto.conversation_id,
    );
    return { data: result };
  }

  @Post('classify')
  async classify(
    @CompanyId() companyId: string,
    @Body() dto: ClassifyDto,
  ) {
    const result = await this.classifier.classify(companyId, dto.message);
    return { data: result };
  }

  @Post('suggest')
  async suggest(
    @CompanyId() companyId: string,
    @Body() dto: SuggestDto,
  ) {
    const result = await this.suggestion.suggest(
      companyId,
      dto.message,
      dto.conversation_context,
    );
    return { data: result };
  }

  @Post('summarize')
  async summarize(
    @CompanyId() companyId: string,
    @Body('conversation_text') conversationText: string,
  ) {
    const result = await this.summarizer.summarize(companyId, conversationText);
    return { data: result };
  }

  @Post('hot-lead')
  async detectHotLead(
    @CompanyId() companyId: string,
    @Body('conversation_text') conversationText: string,
  ) {
    const result = await this.hotLeadDetector.detect(companyId, conversationText);
    return { data: result };
  }

  @Post('rag')
  async answerWithRag(
    @CompanyId() companyId: string,
    @Body('question') question: string,
  ) {
    const result = await this.ragService.answer(companyId, question);
    return { data: result };
  }

  @Get('logs')
  async logs(
    @CompanyId() companyId: string,
    @Query('limit') limit?: string,
  ) {
    const items = await this.logRepo.findByCompanyId(
      companyId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data: items };
  }
}
