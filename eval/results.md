# Eval results

50 documents (invoices, policies, statements). Field accuracy: exact match for IDs/dates, 1-cent tolerance for amounts, normalised match for names. Cost is an estimate at list price; actual spend on free tiers is $0.

> Rows marked **simulated** come from a deterministic stand-in model that reads the ground truth and injects errors. They exercise the pipeline and CI gate only. Run `npm run eval:live` for real model numbers.

| Model | Version | Field accuracy | Invoice | Policy | Statement | Schema pass | Pass 1st try | p50 ms | p95 ms | Est. cost/doc |
|---|---|---|---|---|---|---|---|---|---|---|
| simulated-strong (simulated) | simulated-strong-sim | 97.2% | 97.2% | 95.8% | 98.8% | 98.0% | 98.0% | 968 | 1457 | $0 |
| simulated-weak (simulated) | simulated-weak-sim | 87.6% | 87.6% | 89.8% | 85.3% | 88.0% | 66.0% | 2360 | 4347 | $0 |
