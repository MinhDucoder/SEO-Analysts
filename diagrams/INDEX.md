# Diagram Index — SEO Analyst Platform

> All diagrams use PlantUML. Open `.puml` files with PlantUML extension in VS Code or paste into [plantuml.com](https://www.plantuml.com/plantuml/uml/).

## Original Diagrams (Monolith Design)

| # | Diagram | File | Type | Generated |
|---|---------|------|------|-----------|
| 01 | [ERD (original)](01-erd.puml) | `01-erd.puml` | class/ERD | 2026-04-09 |
| 02 | [Use Case — User](02-usecase-user.puml) | `02-usecase-user.puml` | usecase | 2026-04-09 |
| 03 | [Use Case — Admin](03-usecase-admin.puml) | `03-usecase-admin.puml` | usecase | 2026-04-09 |
| 04 | [Function Decomposition](04-function-decomposition.puml) | `04-function-decomposition.puml` | mindmap | 2026-04-09 |
| 05 | [Sequence — Login](05-sequence-login.puml) | `05-sequence-login.puml` | sequence | 2026-04-09 |
| 06 | [Sequence — Audit (original)](06-sequence-audit.puml) | `06-sequence-audit.puml` | sequence | 2026-04-09 |
| 07 | [Sequence — Export PDF](07-sequence-export-pdf.puml) | `07-sequence-export-pdf.puml` | sequence | 2026-04-09 |
| 08 | [Architecture — Microservices (original)](08-architecture-microservices.puml) | `08-architecture-microservices.puml` | component | 2026-04-09 |
| 09 | [DFD Level 1](09-dfd-level1.puml) | `09-dfd-level1.puml` | component | 2026-04-09 |
| 10 | [Folder Tree — Root](10-folder-tree-root.puml) | `10-folder-tree-root.puml` | salt/tree | 2026-04-09 |
| 11 | [Folder Tree — Frontend](11-folder-tree-frontend.puml) | `11-folder-tree-frontend.puml` | salt/tree | 2026-04-09 |
| 12 | [Folder Tree — Backend](12-folder-tree-backend.puml) | `12-folder-tree-backend.puml` | salt/tree | 2026-04-09 |
| 13 | [CI/CD Pipeline](13-cicd-pipeline.puml) | `13-cicd-pipeline.puml` | activity | 2026-04-09 |

## Microservices Architecture Diagrams (Updated Design)

| # | Diagram | File | Type | Generated | Spec Section |
|---|---------|------|------|-----------|--------------|
| 14 | [ERD — 3 Databases (Database-per-Service)](14-erd-microservices.puml) | `14-erd-microservices.puml` | class/ERD | 2026-04-10 | §5 |
| 15 | [Audit Pipeline — Hybrid Orchestration + Choreography](15-sequence-audit-pipeline.puml) | `15-sequence-audit-pipeline.puml` | sequence | 2026-04-10 | §3 |
| 16 | [gRPC + BullMQ Communication Map](16-component-grpc-bullmq.puml) | `16-component-grpc-bullmq.puml` | component | 2026-04-10 | §4, §3.3 |
| 17 | [Docker Compose Deployment (9 Containers)](17-deployment-docker.puml) | `17-deployment-docker.puml` | deployment | 2026-04-10 | §10 |
| 18 | [Crawler Service Decision Tree](18-activity-crawler.puml) | `18-activity-crawler.puml` | activity | 2026-04-10 | §7 |
| 19 | [SEO Rule Engine Class Diagram (20 Rules)](19-class-rule-engine.puml) | `19-class-rule-engine.puml` | class | 2026-04-10 | §6 |

## Shared Style

All diagrams use `_style.iuml` for consistent theming (Helvetica, `#0F4761` primary, `smetana` layout).
