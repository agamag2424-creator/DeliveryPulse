# Connector mapping notes (Epic 5)

Report generation still consumes a **sprint-shaped** `NormalisedTaskData` workstream: planned/completed/in-progress counts, blockers, recent completions, team members, and optional start/end dates. Jira maps that natively (active sprint + issues). Asana, Monday.com, and Trello do not have sprints, so v1 maps the closest analog. The report engine input schema does **not** need a breaking change for launch.

## Shared target

`src/lib/connectors/types.ts` → `NormalisedTaskData`

| Field | Jira | Asana | Monday.com | Trello |
|---|---|---|---|---|
| `sprintName` | Active/recent sprint name | Asana project name | Board name | Board name |
| `sprintStartDate` / `sprintEndDate` | Sprint dates | Project `start_on` / `due_on` if set, else empty | Empty (boards have no sprint window) | Empty |
| `tasksPlanned` | Issues in the sprint | Tasks in the project | Board items | Open cards |
| `tasksCompleted` | Done category | `completed: true` | Status text includes done/complete | List name includes done/complete |
| `tasksInProgress` | Indeterminate/new | Incomplete tasks | Working / not done or stuck | Other lists, not blocked |
| `blockers` | Status name contains “block” | Tag, section, or name contains “block” | Status Stuck / blocked, or blocked group | List or label named blocked (or red label) |
| `issueKey` | Jira issue key | Task gid | Item id | Card id |
| `recentCompletions` | Done + updated in 7 days | Completed in last 7 days | Done items updated in 7 days | Done-list cards active in 7 days |
| `teamMembers` | Issue assignees | Task assignees | People column | Board members |
| `confidence` | Active sprint = HIGH | ≥3 tasks and dates = HIGH | ≥3 items = HIGH | ≥3 cards = HIGH |

## Where Jira-shaped assumptions leak

- The first workstream is still treated as “the sprint.” Multi-section Asana projects, Monday groups, and Trello lists are **flattened** into one workstream.
- Milestone dates, billing value, and RAID still come from Delivery Pulse project fields / PM gap-fill — not from these tools.
- Monday/Trello usually produce **empty sprint dates**, so reporting period stays the calendar week from the report form.
- Status mapping is heuristic (name/text), not a per-customer workflow config.
- Agent fetch uses the **first successful** mapped connector if several are active on one project.

No schema generalization is required for v1. A later epic can add per-list/group workstreams if customers need it.
