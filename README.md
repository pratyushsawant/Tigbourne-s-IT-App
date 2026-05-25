# Tigbourne Capital — Oil Field Data Platform

## Purpose

A data platform that lets oil companies, investment banks, and chemical suppliers screen any oil field in the world, filter by key parameters, and export analysis. Built for Tigbourne Capital, whose 3+ years of accumulated field data is the competitive moat — no competitor combines field-level data with chemical recovery economics in one place.

## Who It's For

- **Chemical companies** (Dow, BASF, SNF) — find fields that match their chemicals
- **Oilfield service companies** (SLB, Baker Hughes, Halliburton) — targeting data for chemical recovery products
- **Investment banks** (UBS, Capital One) — independent field valuation before and after chemical recovery
- **Oil operators** (ExxonMobil, Chevron, EGPC) — decide between chemicals, drilling, or selling with hard numbers
- **PE / Investment funds** — pre-screened fields ranked by recovery economics

## MVP Scope

Filter oil field data by key parameters and export results in CSV, PDF, or DOCX. That's it. CEOR calculations and NPV modelling come after the MVP is complete.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend** (Nalin): FastAPI (Python) + PostgreSQL
- **Auth**: JWT tokens with permission levels (admin, institutional, individual)
- **Storage**: AWS S3
- **API docs**: Auto-generated OpenAPI spec

## Team

| Person | Role |
|--------|------|
| Nalin Mehta | Team Lead + Back-End |
| Zain | Co-Lead + Back-End |
| Prat | Front-End Developer |
| Min | Data & Parsing |

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Timeline

- **Month 1 (June 2026)**: Foundations + MVP — filter, export, login
- **Month 2 (July 2026)**: CEOR & financial engine — break-even, NPV, water cut curves
- **Month 3 (August 2026)**: Polish & demo — full integration, performance, UBS/Capital One demo

## POC Target

August 31, 2026

## Confidentiality

All content is covered by the NDA and non-circumvention agreement with Tigbourne Capital. Nothing may be shared outside the project team without written authorization.
