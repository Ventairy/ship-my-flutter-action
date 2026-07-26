import { Octokit } from "@octokit/rest";
import { loadChangelog } from "./config.js";
import { ShipError } from "./errors.js";
import { configureBotIdentity, currentBranch, git, isClean } from "./git.js";
import { runBeforeReleasePrHook } from "./hooks.js";
import { applyReleasePlan } from "./manifest-files.js";
import { releasePullRequestBody } from "./changelog.js";
function branchName(config, platform) {
    return `${config.releaseBranchPrefix}/${platform}`;
}
async function ensureReleaseBranch(root, config, platform) {
    const branch = branchName(config, platform);
    await git(root, ["fetch", "origin", config.targetBranch, branch], {
        allowFailure: true,
    });
    const remoteBranch = await git(root, ["rev-parse", "--verify", "--quiet", `origin/${branch}`], { allowFailure: true });
    if (remoteBranch) {
        await git(root, ["checkout", "-B", branch, `origin/${branch}`]);
        await git(root, ["merge", "--no-edit", `origin/${config.targetBranch}`]);
    }
    else {
        await git(root, [
            "checkout",
            "-B",
            branch,
            `origin/${config.targetBranch}`,
        ]);
    }
    return branch;
}
async function ensureLabel(octokit, context, name, color) {
    try {
        await octokit.issues.getLabel({
            owner: context.owner,
            repo: context.repo,
            name,
        });
    }
    catch (error) {
        if (typeof error === "object" &&
            error !== null &&
            "status" in error &&
            error.status === 404) {
            await octokit.issues.createLabel({
                owner: context.owner,
                repo: context.repo,
                name,
                color,
            });
            return;
        }
        throw error;
    }
}
export async function createOrUpdateReleasePullRequest(root, config, plan, context, octokit = new Octokit({ auth: context.token })) {
    if (!(await isClean(root))) {
        throw new ShipError("The worktree must be clean before updating a release PR.", "DIRTY_WORKTREE");
    }
    const startingBranch = await currentBranch(root);
    await configureBotIdentity(root);
    const branch = await ensureReleaseBranch(root, config, plan.platform);
    try {
        const refreshedPlan = { ...plan, headSha: plan.headSha };
        await applyReleasePlan(root, refreshedPlan);
        await runBeforeReleasePrHook(root, config, refreshedPlan);
        await git(root, ["add", "."]);
        const staged = await git(root, ["diff", "--cached", "--name-only"]);
        if (staged) {
            await git(root, [
                "commit",
                "-m",
                `chore(${plan.platform}): release ${plan.nextVersion}`,
            ]);
        }
        await git(root, ["push", "--set-upstream", "origin", branch]);
        const changelog = await loadChangelog(root);
        const release = changelog.platforms[plan.platform].releases[plan.nextVersion];
        if (!release) {
            throw new ShipError(`Missing changelog entry for ${plan.platform} ${plan.nextVersion}`, "MISSING_CHANGELOG");
        }
        const existing = await octokit.pulls.list({
            owner: context.owner,
            repo: context.repo,
            state: "open",
            head: `${context.owner}:${branch}`,
            base: config.targetBranch,
            per_page: 1,
        });
        const title = `chore(${plan.platform}): release ${plan.nextVersion}`;
        const body = releasePullRequestBody(plan.platform, release);
        const pull = existing.data[0] ??
            (await octokit.pulls.create({
                owner: context.owner,
                repo: context.repo,
                head: branch,
                base: config.targetBranch,
                title,
                body,
            })).data;
        if (existing.data[0]) {
            await octokit.pulls.update({
                owner: context.owner,
                repo: context.repo,
                pull_number: pull.number,
                title,
                body,
            });
        }
        await ensureLabel(octokit, context, "autorelease: pending", "fbca04");
        await octokit.issues.addLabels({
            owner: context.owner,
            repo: context.repo,
            issue_number: pull.number,
            labels: ["autorelease: pending"],
        });
        return { branch, pullRequestNumber: pull.number };
    }
    finally {
        if (startingBranch && startingBranch !== branch) {
            await git(root, ["checkout", startingBranch], { allowFailure: true });
        }
    }
}
export async function findReleasePullRequest(context, config, platform) {
    const octokit = new Octokit({ auth: context.token });
    const pulls = await octokit.pulls.list({
        owner: context.owner,
        repo: context.repo,
        state: "all",
        head: `${context.owner}:${branchName(config, platform)}`,
        base: config.targetBranch,
        per_page: 10,
    });
    return pulls.data[0]?.number;
}
//# sourceMappingURL=github.js.map