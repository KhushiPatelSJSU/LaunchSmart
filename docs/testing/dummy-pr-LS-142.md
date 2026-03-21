# Dummy PR: LS-142

## Title
feat(slack): scaffold /spec command + jira key validation

## Linked Jira
LS-142

## Summary
Implements the first slice of `/spec <jira-key>` by adding validation, a dummy handler, and an API route for Slack integration testing.

## What is done in this PR
- [x] Add Jira key validator (`[A-Z]+-\d+`)
- [x] Add `handleSpecCommand` scaffold
- [x] Add API route: `POST /api/integrations/slack/spec`
- [x] Return validation error for malformed keys
- [x] Return placeholder success response for valid keys

## What is not done yet
- [ ] Jira API integration to fetch issue details
- [ ] Acceptance criteria extraction from Jira description/custom fields
- [ ] 404/401 Jira error mapping
- [ ] Request id + latency logging
- [ ] Integration tests with mocked Jira API
- [ ] Slack message formatting parity with production command response

## Progress estimate
- Completed spec items: 5/11
- Estimated completion: 45%
- Major remaining effort: Jira client integration + robust error handling + tests

