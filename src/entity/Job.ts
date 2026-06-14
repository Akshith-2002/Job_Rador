import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * One LinkedIn job posting, normalized + scored against the resume.
 * `raw` keeps the full Apify dataset item so nothing is lost.
 */
@Entity({ name: "jobs" })
export class Job {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: "varchar" })
  externalId!: string; // LinkedIn job id (dedupe key)

  @Column({ type: "varchar" })
  title!: string;

  @Column({ type: "varchar" })
  company!: string;

  @Column({ type: "varchar", nullable: true })
  companyUrl!: string | null;

  @Column({ type: "varchar", nullable: true })
  companyLogo!: string | null;

  @Column({ type: "varchar", nullable: true })
  location!: string | null;

  @Column({ type: "int", nullable: true })
  employeeCount!: number | null;

  @Column({ type: "boolean", default: false })
  sizeMatch!: boolean; // company has 50-5000 employees

  @Column({ type: "varchar", nullable: true })
  salary!: string | null;

  @Column({ type: "varchar", nullable: true })
  seniority!: string | null;

  @Column({ type: "varchar", nullable: true })
  employmentType!: string | null;

  @Column({ type: "varchar", nullable: true })
  jobFunction!: string | null;

  @Column({ type: "varchar", nullable: true })
  industries!: string | null;

  @Column({ type: "int", nullable: true })
  applicantsCount!: number | null;

  @Column({ type: "date", nullable: true })
  postedDate!: string | null;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "varchar" })
  jobUrl!: string;

  @Column({ type: "varchar" })
  applyUrl!: string;

  @Column({ type: "varchar" })
  searchTitle!: string; // which search produced it

  @Column({ type: "float", default: 0 })
  fitScore!: number; // 1-10

  @Column({ type: "text", array: true, default: () => "'{}'" })
  matchReasons!: string[];

  @Column({ type: "boolean", default: false })
  topPick!: boolean; // flagged "apply today"

  // Application tracking: new | applied | no_response | rejected | selected
  @Column({ type: "varchar", default: "new" })
  status!: string;

  @Column({ type: "timestamptz", nullable: true })
  statusUpdatedAt!: Date | null;

  @Column({ type: "jsonb", nullable: true })
  raw!: any;

  // Cached, JD-tailored resume (structured JSON) generated via the Claude API.
  @Column({ type: "jsonb", nullable: true })
  tailoredResume!: any;

  @Column({ type: "timestamptz", nullable: true })
  tailoredAt!: Date | null;

  @CreateDateColumn()
  scrapedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
