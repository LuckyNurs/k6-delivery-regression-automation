# K6 Delivery Regression Automation

End-to-end API regression testing using **k6** for a delivery order flow.

## Scope
- Authentication
- Delivery widget
- Outlet discovery
- Menu retrieval
- Cart & checkout
- Payment redirect validation

## Tech Stack
- k6
- JavaScript
- REST API

## Notes
This project is a **sanitized portfolio version** inspired by a real-world production system.  
All endpoints, credentials, and business data have been anonymized.

## How to Run
```bash
k6 run delivery-regression.k6.js
