import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { trace } from '../trace.mjs'
const fixture = () => JSON.parse(readFileSync(new URL('../examples/rbac.json', import.meta.url)))

test('binding determines scope while role preserves resourceNames', () => {
  const result = trace(fixture())
  assert.deepEqual(result.grants.map(g => g.scope), ['staging', '*'])
  assert.deepEqual(result.grants[0].names, ['build-config'])
  assert.equal(result.unresolved[0].role, 'retired')
})

test('namespace selects the role even when names collide', () => {
  const { items } = fixture()
  const role = { ...items[0], kind: 'Role', metadata: { name: 'reader', namespace: 'a' } }
  const other = { ...role, metadata: {name:'reader', namespace:'b'}, rules: [] }
  const binding = { ...items[1], metadata: {name:'local', namespace:'b'}, roleRef:{kind:'Role',name:'reader'} }
  assert.deepEqual(trace({items:[role,other,binding]}).grants, [])
})

test('wildcards apply but a subresource is distinct', () => {
  const data = fixture()
  data.items[0].rules = [{apiGroups:['*'],resources:['*'],verbs:['*']},
    {apiGroups:[''],resources:['secrets/status'],verbs:['get']}]
  const result = trace(data)
  assert.equal(result.grants.length, 2)
  assert.deepEqual(result.grants[0].verbs, ['get','list','watch'])
})
