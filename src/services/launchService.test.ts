import assert from 'node:assert/strict'
import test from 'node:test'
import { deriveWorkingDir } from './launchService.js'

test('deriveWorkingDir returns the parent directory for a Windows exe path', () => {
  assert.equal(
    deriveWorkingDir(String.raw`D:\Games\CLANNAD\CLANNAD.exe`),
    String.raw`D:\Games\CLANNAD`
  )
})

test('deriveWorkingDir returns empty string when the path has no parent', () => {
  assert.equal(deriveWorkingDir('CLANNAD.exe'), '')
})
