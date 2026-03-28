# SSH REMEDIATION — LUCY ACCESS

## Scope
Apply to:
- Seraphim (no AGENTS.md)
- Aurelion (no AGENTS.md)
- Elior (AGENTS.md exists, missing SSH block)

---

## Actions

### 1. Create / Update AGENTS.md

For each agent:

- If AGENTS.md does not exist → create it
- If it exists → append SSH section (do not overwrite existing content)

---

## SSH BLOCK (IDENTICAL FOR ALL THREE)

### SSH — Lucy Access

Purpose:
Enable cross-node communication and inspection between this agent and Lucy.

Configuration:

- Host alias: `lucy`
- Key file: `~/.ssh/lucy`
- User: (existing system user)
- Method: SSH key-based authentication

Usage:

- Connect:
  `ssh lucy`

- Test connection:
  `ssh lucy 'echo OK'`

- Remote execution:
  `ssh lucy '<command>'`

---

## 2. Deploy SSH Key

For each agent workspace:

- Place key: `~/.ssh/lucy`
- Permissions: `chmod 600 ~/.ssh/lucy`
- Ensure SSH config includes Host alias `lucy`

---

## 3. Validation

From each agent context:

- Run:
  `ssh lucy 'echo OK'`

Expected:
→ OK

If failure:
→ report immediately, do not proceed

---

## 4. Completion Condition

All three agents:
- have AGENTS.md with SSH block
- have lucy key installed
- can successfully execute SSH test

---

## Rule

No cross-node governance or execution occurs
until SSH validation passes.

---

## Principle

Connection enables coordination
Verification enables trust
