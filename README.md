# RBAC Secret Paths

Trace which Kubernetes bindings grant read access to Secrets, where each grant applies, and whether it is limited to named resources. Analyze a saved JSON snapshot without cluster credentials.

## Reproduce the case

Requires Node.js 22+. All examples use synthetic data and run locally with the standard library. Run from the repository root.

```sh
node cli.mjs examples/rbac.json
```

The build service account has a named get grant in staging. A separate ClusterRoleBinding grants the audit group the same permission across namespaces. A dangling reference appears as an unresolved binding for follow-up.

## Design and limits

Export Role, ClusterRole, RoleBinding and ClusterRoleBinding objects together as a Kubernetes List. The report traces binding → role → rule and preserves subjects as declared. It reads the materialized rules of aggregated ClusterRoles. It does not expand group membership, evaluate external authorizers or prove a particular API call will succeed. For list/watch permissions with resourceNames, clients must supply a matching name field selector. [Kubernetes RBAC reference](https://kubernetes.io/docs/reference/access-authn-authz/rbac/).

## Verification

```sh
node --test
```

Tests cover namespaced bindings to ClusterRoles, same-name Roles in different namespaces, wildcard grants, subresources, and missing references.
