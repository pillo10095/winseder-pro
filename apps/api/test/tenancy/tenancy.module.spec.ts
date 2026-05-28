import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Company } from '@/modules/tenancy/entities/company.entity';
import { Plan } from '@/modules/tenancy/entities/plan.entity';
import { Subscription } from '@/modules/tenancy/entities/subscription.entity';
import { TenancyModule } from '@/modules/tenancy/tenancy.module';

describe('TenancyModule', () => {
  it('should compile the module', async () => {
    const mockDataSource = {
      entityMetadatas: [],
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [TenancyModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(mockDataSource as unknown as DataSource)
      .overrideProvider(EntityManager)
      .useValue({})
      .overrideProvider(getRepositoryToken(Company))
      .useValue({} as Repository<Company>)
      .overrideProvider(getRepositoryToken(Plan))
      .useValue({} as Repository<Plan>)
      .overrideProvider(getRepositoryToken(Subscription))
      .useValue({} as Repository<Subscription>)
      .compile();

    expect(module).toBeDefined();
  });
});
