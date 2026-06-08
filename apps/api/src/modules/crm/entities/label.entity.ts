import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { Company } from '../../tenancy/entities/company.entity';

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 7, default: '#6B7280' })
  color!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
