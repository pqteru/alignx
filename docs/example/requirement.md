---
id: ALIGNX-DEMO
title: 使用者登入
version: 1.0.0
stakeholders:
  - 產品
  - 工程
---

## Goals

使用者能安全登入，並在失敗時獲得明確回饋。

## User stories

- 身為使用者，我希望能用電子郵件與密碼登入，以便進入儀表板。
- 身為使用者，我希望在送出無效資料前就看到驗證錯誤。
- 身為使用者，我希望在驗證進行中看到載入指示。

## Constraints

- 登入 API 逾時：5 秒
- 密碼至少 8 個字元

## UI surfaces

- login-form
- inline-field-errors
- global-error-banner
- post-login-dashboard

## Non-goals

- OAuth / SSO（v2）
