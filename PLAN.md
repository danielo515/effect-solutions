# Effect Best Practices - Project Plan

## Overview
Multi-purpose repository for Effect TypeScript best practices with multiple distribution/usage modes.

## Use Cases

### 1. Documentation Files (Markdown)
- Best practices for setting up Effect applications
- Reference material for developers
- Living documentation that stays current

### 2. Frontend Server
- Web interface to browse best practices
- Read/navigate documentation easily
- Hosted viewing experience

### 3. Automated Doc Validation (Cron Job)
- Runs via GitHub Actions
- Uses Claude Code to verify external links/docs still valid
- Opens issues/PRs when documentation outdated
- Keeps best practices current automatically

### 4. Claude Skill Distribution
- Export docs as reference material for Claude skill
- Root SKILL.md written from Claude's perspective
- Downloadable skill package for Claude users
- Special packaging format for distribution

## Skill Packaging Format

Based on skill-creator guidance:
- SKILL.md with YAML frontmatter (name + description)
- references/ directory containing markdown best practices
- Package as .zip file for distribution
- Users download and install in their .claude/skills directory

## Questions to Resolve
- Frontend framework choice?
- Cron frequency for validation?
- Which external sites to validate?
- Skill scope - all Effect or specific domains?
