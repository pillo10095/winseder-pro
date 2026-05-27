export class CompanyDto {
  id!: string;
  name!: string;
  slug!: string;
  logo_url?: string;
  is_active!: boolean;
  created_at!: Date;
}
