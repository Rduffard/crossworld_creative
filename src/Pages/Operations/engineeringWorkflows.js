export function deploymentRuns(repo) {
  return repo.details?.workflows?.items?.filter(item => /\bdeploy(?:ment|ing)?\b/i.test(item.name)) || [];
}
