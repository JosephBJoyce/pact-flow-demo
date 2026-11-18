/**
 * Single source of truth for "which version / which branch is this build?".
 *
 * PactFlow's Matrix is keyed on (pacticipant, VERSION, BRANCH). Best practice:
 *   - version = git commit SHA (unique, immutable, never reused)
 *   - branch  = git branch name (so branch-aware selectors work)
 * Both the consumer publish step and the provider verification step import this,
 * so they can never disagree. CI env vars win; GIT_COMMIT / GIT_BRANCH can be set
 * manually (scripts/demo.sh does this to simulate several branches locally).
 */
const { execSync } = require('child_process');
const sh = (c) => { try { return execSync(c, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };

const info = {
  version: process.env.GIT_COMMIT || process.env.GITHUB_SHA || sh('git rev-parse --short HEAD') || 'local',
  // GITHUB_HEAD_REF is the PR source branch (only set on pull_request events)
  branch: process.env.GIT_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || sh('git rev-parse --abbrev-ref HEAD') || 'local',
};
module.exports = info;

if (require.main === module) console.log(info[process.argv[2]]);
