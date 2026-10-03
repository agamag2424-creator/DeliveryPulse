// PHASE 1 FROZEN — DO NOT MODIFY WITHOUT EXPLICIT WRITTEN INSTRUCTION FROM AGAM
// This file is part of the Phase 1 foundation and contains deliberate design decisions.
// Phase 2 extends this file only where absolutely necessary.
// Permitted Phase 2 additions: auth session check at route level, saveReport() call after generation.
// Everything else: unchanged.

export type RAGStatus = "RED" | "AMBER" | "GREEN";
export type ExtendedRAGStatus = RAGStatus | "GREY";

export type ProjectPhase =
  | "Initiation"
  | "Planning"
  | "Build"
  | "Testing"
  | "Go-Live"
  | "Hypercare";

export interface ProjectData {
  projectName: string;
  clientName: string;
  reportingPeriodFrom: string;
  reportingPeriodTo: string;
  deliveryPMName: string;
  currentProjectPhase: ProjectPhase;
}

export interface HealthData {
  currentBudgetBurnPercent: number;
  currentScopeCompletionPercent: number;
  currentScheduleHealthPercent: number;
  activeWorkstreams?: number;
  teamSize?: number;
}

export interface HistoryRow {
  weekLabel: string;
  budgetBurnPercent: number;
  scopeCompletionPercent: number;
  scheduleHealthPercent: number;
}

export type MilestoneStatus = "Complete" | "In Progress" | "Not Started" | "Delayed";

export interface Milestone {
  milestoneName: string;
  baselineDate: string;
  forecastDate: string;
  status: MilestoneStatus;
  owner?: string;
}

export type DependencyStatus = "Clear" | "At Risk" | "Blocking";

export interface Blocker {
  description: string;
  type?: "Internal" | "External" | "Client" | "Vendor";
  daysOpen?: number;
  owner?: string;
  impact?: string;
}

export interface Workstream {
  workstreamName: string;
  plannedTeamSize: number;
  actualTeamSize: number;
  tasksPlanned: number;
  tasksCompleted: number;
  activeBlockers?: string;
  dependencyStatus: DependencyStatus;
  blockers?: Blocker[];
}

export interface RiskItem {
  riskDescription: string;
  probability: "L" | "M" | "H";
  impact: "L" | "M" | "H";
  owner?: string;
  mitigationAction?: string;
  status: string;
  linkedMilestone?: string;
}

export interface IssueItem {
  description: string;
  severity: "L" | "M" | "H" | "Critical";
  dateRaised: string;
  owner?: string;
  status: string;
  linkedDecision?: string;
}

export interface Dependency {
  description: string;
  type: string;
  dueDate: string;
  status: string;
  owner?: string;
  blockingWhat: string;
}

export interface Assumption {
  statement: string;
  validated: boolean;
  impactIfWrong: string;
  owner?: string;
}

export type EngagementModel = "TNM" | "FP";

export interface ChangeRequest {
  crId: string;
  description: string;
  valueImpact: number;
  modelImpact: string;
  status: "Approved" | "Pending" | "Rejected";
  commercialImpactNarrative?: string;
}

export interface CommercialHistoryRow {
  weekLabel: string;
  actualCostThatWeek?: number;
  eacAtEndOfWeek?: number;
  internalCost?: number;
  forecastFinalCost?: number;
}

export interface MilestoneBillingRow {
  milestoneName: string;
  billingValue: number;
  dueDate: string;
  status: "Scheduled" | "Due" | "Paid" | "Overdue";
}

export interface CommercialData {
  engagementModel: EngagementModel;
  originalContractValue: number;
  currency: "USD" | "GBP" | "EUR" | "INR";
  engagementStart: string;
  engagementEnd: string;
  totalApprovedHours?: number;
  hoursConsumedToDate?: number;
  plannedWeeklyBurnRate?: number;
  internalCostToDate?: number;
  forecastFinalInternalCost?: number;
  tnmHistory?: CommercialHistoryRow[];
  fpHistory?: CommercialHistoryRow[];
  milestoneBilling?: MilestoneBillingRow[];
  changeRequests: ChangeRequest[];
}

export interface Decision {
  decisionTitle: string;
  ownerNameRole: string;
  ownerOrganisation: string;
  dueDate: string;
  priority: "Critical" | "High" | "Normal";
  impactIfDelayed?: string;
}

export interface ReportInput {
  projectData: ProjectData;
  healthData: HealthData;
  healthHistory: HistoryRow[];
  milestones: Milestone[];
  freeTextDump: string;
  workstreams: Workstream[];
  raid: {
    risks: RiskItem[];
    issues: IssueItem[];
    dependencies: Dependency[];
    assumptions: Assumption[];
  };
  commercialData: CommercialData;
  decisions: Decision[];
}

export interface ForecastMetric {
  week_plus_1_base: number;
  week_plus_1_optimistic: number;
  week_plus_1_pessimistic: number;
  week_plus_2_base: number;
  week_plus_2_optimistic: number;
  week_plus_2_pessimistic: number;
  narrative: string;
  forecast_rag: RAGStatus;
}

export interface WorkstreamAnalysis {
  workstream_name: string;
  overall_rag: RAGStatus;
  velocity_percent: number;
  velocity_rag: RAGStatus;
  blocker_count: number;
  blocker_type: "none" | "internal" | "external";
  capacity_rag: RAGStatus;
  dependency_rag: RAGStatus;
  blocker_details: {
    description: string;
    type: "Internal" | "External" | "Client" | "Vendor";
    days_open: number;
    owner: string;
    impact: string;
  }[];
  rag_score_breakdown: {
    velocity_score: number;
    blocker_score: number;
    capacity_score: number;
    dependency_score: number;
    weighted_total: number;
  };
}

export interface RAIDItem {
  category: "RISK" | "ISSUE" | "DEPENDENCY" | "ASSUMPTION";
  title: string;
  rag: "RED" | "AMBER";
  severity_label: string;
  owner: string | "Unowned";
  threatens: string;
  action_required: string;
  linked_decision: boolean;
  days_open?: number;
  score?: number;
}

export interface FinancialKPIs {
  contract_value: number;
  currency: string;
  consumed_to_date: number;
  consumed_percent: number;
  consumed_rag: RAGStatus;
  remaining: number;
  forecast_final: number;
  variance: number;
  variance_percent: number;
  variance_rag: RAGStatus;
  engagement_model: EngagementModel;
}

export interface SlideData {
  rag_status: RAGStatus;
  rag_reason: string;
  rag_ai_suggested: RAGStatus;
  schedule_variance_days: number;
  schedule_variance_narrative: string;
  timeline_progress_percent: number;
  executive_summary: string;
  highlights_wins: string[];
  highlights_concerns: string[];
  forecast: {
    budget_burn: ForecastMetric;
    scope_completion: ForecastMetric;
    schedule_health: ForecastMetric;
  };
  workstream_analysis: WorkstreamAnalysis[];
  raid_attention_items: RAIDItem[];
  raid_summary: {
    risks: {
      total: number;
      attention: number;
      managed: number;
      rag: ExtendedRAGStatus;
      top_item: string;
    };
    issues: {
      total: number;
      attention: number;
      managed: number;
      rag: ExtendedRAGStatus;
      top_item: string;
    };
    dependencies: {
      total: number;
      attention: number;
      managed: number;
      rag: ExtendedRAGStatus;
      top_item: string;
    };
    assumptions: {
      total: number;
      attention: number;
      managed: number;
      rag: ExtendedRAGStatus;
      top_item: string;
    };
  };
  financial_kpis: FinancialKPIs;
  financial_narrative: string;
  eac_overrun_flag: boolean;
  cr_summary: string;
  decision_impact_statements: { decision_title: string; impact: string }[];
  commercial_summary_sentence: string;
}
