#!/bin/bash
cat << 'EOF'
MANDATORY: .claude/rules/workflow.md is loaded in your context. Before responding to any planning, architectural, or implementation question, apply every rule it contains. Specifically enforce:
- Line 32: if anything in the docs appears broken or contradictory, raise it before answering — do not scaffold against a design that looks wrong
- Line 33: every tradeoff must map to grocery-buddy's actual stack, scale, and access patterns — cut generic tradeoffs that do not apply here
- Line 34: for any infrastructure, database, or library claim, use WebSearch/WebFetch to verify against official docs before stating it — no general knowledge alone — state the source URL
- Line 35: ground every recommendation in: what this app needs + what authoritative sources say at this scale + what is being consciously accepted or rejected
- Line 36: if implementation is pushing against the architecture, flag the architectural question first — not the optimization within the current approach
- Plan-first: present files to create/modify + expected outcome + open questions — wait for Arib's approval before writing any code
EOF
