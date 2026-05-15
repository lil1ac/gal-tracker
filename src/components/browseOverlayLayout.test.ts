import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

function classBody(className: string) {
  const match = css.match(new RegExp(`\\.${className}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))
  assert.ok(match, `Expected .${className} to exist`)
  return match[1]
}

{
  const browseShell = classBody('browse-shell')
  assert.match(browseShell, /flex-1/, 'Browse shell must remain inside the main content area')
}

for (const className of ['detail-workbench', 'bangumi-entity-page']) {
  const body = classBody(className)
  assert.match(body, /flex-1/, `.${className} should render as an in-layout detail page`)
  assert.match(body, /overflow-y-auto/, `.${className} should own detail scrolling`)
  assert.doesNotMatch(body, /inset-0/, `.${className} must not span the full viewport`)
  assert.doesNotMatch(body, /fixed/, `.${className} must not be a viewport overlay`)
}

for (const removedClassName of ['browse-detail-overlay', 'bangumi-entity-overlay']) {
  assert.doesNotMatch(css, new RegExp(`\\.${removedClassName}\\s*\\{`), `.${removedClassName} should not exist after drilldown navigation`)
}
