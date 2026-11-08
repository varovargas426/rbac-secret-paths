const readVerbs = ['get', 'list', 'watch']
const roleKey = (kind, namespace, name) => JSON.stringify([kind, namespace, name])

export function trace(snapshot) {
  if (!Array.isArray(snapshot.items)) throw new Error('Expected a Kubernetes List with items')
  const roles = new Map()
  const grants = [], unresolved = []
  for (const item of snapshot.items) {
    if (!['Role', 'ClusterRole'].includes(item.kind)) continue
    const ns = item.kind === 'Role' ? item.metadata.namespace : null
    roles.set(roleKey(item.kind, ns, item.metadata.name), item)
  }
  for (const binding of snapshot.items) {
    if (!['RoleBinding', 'ClusterRoleBinding'].includes(binding.kind)) continue
    const { name, namespace } = binding.metadata
    const ref = binding.roleRef
    const scope = binding.kind === 'RoleBinding' ? namespace : '*'
    const role = roles.get(roleKey(ref.kind, ref.kind === 'Role' ? namespace : null, ref.name))
    if (!role || (binding.kind === 'ClusterRoleBinding' && ref.kind !== 'ClusterRole')) {
      unresolved.push({ binding: name, scope, role: ref.name })
      continue
    }
    for (const [index, rule] of (role.rules ?? []).entries()) {
      if (!rule.apiGroups?.some(g => g === '' || g === '*')) continue
      if (!rule.resources?.some(r => r === 'secrets' || r === '*')) continue
      const verbs = readVerbs.filter(v => rule.verbs.includes(v) || rule.verbs.includes('*'))
      if (!verbs.length) continue
      grants.push({ binding: name, scope, role: ref.name, ruleIndex: index, verbs,
        names: rule.resourceNames?.length ? rule.resourceNames : '*', subjects: binding.subjects ?? [] })
    }
  }
  return { grants, unresolved }
}
