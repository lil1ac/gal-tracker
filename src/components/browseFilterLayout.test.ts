import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const filterBar = readFileSync(join(process.cwd(), 'src', 'components', 'BrowseFilterBar.tsx'), 'utf8')
const css = readFileSync(join(process.cwd(), 'src', 'index.css'), 'utf8')

{
  assert.match(filterBar, /browse-subject-nav/, 'Subject ranking tabs should be a dedicated works navigation group')
  assert.match(filterBar, /browse-search-scope/, 'Character and person search should be grouped as data search scope')
  assert.ok(
    filterBar.indexOf('browse-subject-nav') < filterBar.indexOf('browse-search-scope'),
    'Works navigation should appear before the secondary data-search scope',
  )
}

{
  assert.match(
    filterBar,
    /filters\.searchKind === 'subject' && \([\s\S]*?<div className="browse-filter-controls">/,
    'Subject-only filters should be rendered only for works searches',
  )
  assert.doesNotMatch(
    filterBar,
    /disabled=\{filters\.searchKind !== 'subject'\}/,
    'Character and person searches should not show disabled works-only filters',
  )
}

for (const className of ['browse-subject-nav', 'browse-search-scope']) {
  assert.match(css, new RegExp(`\\.${className}\\s*\\{`), `.${className} should have explicit layout styles`)
}
