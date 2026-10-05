import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { RpcInput } from "@getpaseo/plugin";
import type { previewsRpc } from "../shared/previews";

const run = promisify(execFile);
const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ""}` };

type Deployment = { id: number; environment: string; creator: { login: string } | null };
type DeploymentStatus = { state: string; environment_url: string };

async function gh<T>(path: string): Promise<T> {
  const { stdout } = await run("gh", ["api", path], { env, timeout: 15_000 });
  return JSON.parse(stdout) as T;
}

export async function listPreviews({ owner, repo, number }: RpcInput<typeof previewsRpc>) {
  const base = `repos/${owner}/${repo}`;
  const pr = await gh<{ head: { sha: string } }>(`${base}/pulls/${number}`);
  const deployments = await gh<Deployment[]>(`${base}/deployments?sha=${pr.head.sha}&per_page=100`);
  const latest = new Map<string, Deployment>();
  for (const deployment of deployments) {
    if (deployment.creator?.login !== "vercel[bot]") continue;
    if (!deployment.environment.startsWith("Preview")) continue;
    if (!latest.has(deployment.environment)) latest.set(deployment.environment, deployment);
  }
  const previews = await Promise.all(
    [...latest.values()].map(async (deployment) => {
      const [status] = await gh<DeploymentStatus[]>(
        `${base}/deployments/${deployment.id}/statuses?per_page=1`,
      );
      return {
        project: deployment.environment.replace(/^Preview\s*[–-]\s*/, ""),
        state: status?.state ?? "pending",
        url: status?.environment_url || null,
      };
    }),
  );
  return { previews: previews.sort((a, b) => a.project.localeCompare(b.project)) };
}
