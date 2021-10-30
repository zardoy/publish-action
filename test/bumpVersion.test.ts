/// <reference types="jest" />
import { Octokit } from '@octokit/rest'
import { getNextVersionAndReleaseNotes } from '../src/library/bumpVersion'
import { defaultConfig } from '../src/library/config'

const getMockedOctokit = (tags: { name: `v${string}`; commit: { sha: string } }[], commitsInput: ({ message: string; sha?: string } | string)[]) => {
    const commits: { sha: string; commit: { message: string } }[] = commitsInput.map(data => {
        if (typeof data === 'string') return { commit: { message: data }, sha: '' }
        const { message, sha = '' } = data
        return { commit: { message }, sha }
    })
    return {
        repos: {
            async listTags() {
                return { data: tags }
            },
            async listCommits() {
                return { data: commits }
            },
        },
    } as unknown as Octokit
}

const dummyRepo = { owner: '/', repo: '/' }

const args = {
    config: defaultConfig,
    repo: dummyRepo,
}

test('Initial release', async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit([], ['feat: something added']),
            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "none",
      "commitMessagesByNoteRule": Object {
        "rawOverride": Array [
          "🎉 Initial release",
        ],
      },
      "nextVersion": "0.0.1",
    }
  `)
})

test('Just bumps correctly', async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v0.0.9', commit: { sha: '123' } }],
                [
                    'fix: fix serious issue\nfeat: add new feature',
                    'feat: just adding feature',
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "patch",
      "commitMessagesByNoteRule": Object {
        "minor": Array [
          "add new feature",
          "just adding feature",
        ],
        "patch": Array [
          "fix serious issue",
          "first fixes",
        ],
      },
      "nextVersion": "0.0.10",
    }
  `)
})

test('Just bumps correctly when stable', async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v1.0.9', commit: { sha: '123' } }],
                [
                    'fix: fix serious issue\nfeat: add new feature',
                    'feat: just adding feature',
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "minor",
      "commitMessagesByNoteRule": Object {
        "minor": Array [
          "add new feature",
          "just adding feature",
        ],
        "patch": Array [
          "fix serious issue",
          "first fixes",
        ],
      },
      "nextVersion": "1.1.0",
    }
  `)
})

test("Doesn't pick commits below version", async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v1.0.9', commit: { sha: '123' } }],
                [
                    'fix: fix serious issue\nfeat: add new feature',
                    'feat: just adding feature',
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                    {
                        message: 'feat: should not be here',
                        sha: '3213',
                    },
                    'feat: something else',
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "minor",
      "commitMessagesByNoteRule": Object {
        "minor": Array [
          "add new feature",
          "just adding feature",
        ],
        "patch": Array [
          "fix serious issue",
          "first fixes",
        ],
      },
      "nextVersion": "1.1.0",
    }
  `)
})

test('BREAKING gives major', async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v1.0.9', commit: { sha: '123' } }],
                [
                    'fix: fix serious issue\nfeat: add new feature\nBREAKING config was removed',
                    "feat: just adding feature\nBREAKING we broke anything\nfeat: but here we didn't break anything",
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "major",
      "commitMessagesByNoteRule": Object {
        "major": Array [
          "add new feature
     config was removed",
          "just adding feature
     we broke anything",
        ],
        "minor": Array [
          "but here we didn't break anything",
        ],
        "patch": Array [
          "fix serious issue",
          "first fixes",
        ],
      },
      "nextVersion": "2.0.0",
    }
  `)
})

test('BREAKING gives major on unstable', async () => {
    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v0.0.7', commit: { sha: '123' } }],
                [
                    'fix: fix serious issue\nfeat: add new feature\nBREAKING config was removed',
                    'feat: just adding feature\nBREAKING we broke anything',
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "patch",
      "commitMessagesByNoteRule": Object {
        "minor": Array [
          "add new feature
     config was removed",
          "just adding feature
     we broke anything",
        ],
        "patch": Array [
          "fix serious issue",
          "first fixes",
        ],
      },
      "nextVersion": "0.0.8",
    }
  `)
})

// give better name to the test?
test('Operates on description properly', async () => {
    const includeCommit = `
fix: This rare bug was finally fixed closes #33343

Some background for bug goes here...
feat: Add new feature within commit
Description`
    /** only fix should be included, but not test */
    const notIncludeCommit = `
fix: This rare bug was finally fixed fixes #33343

fixes #453
Some background for bug goes here...
test: Fix tests
Tests were hard to fix`

    expect(
        await getNextVersionAndReleaseNotes({
            octokit: getMockedOctokit(
                [{ name: 'v1.0.9', commit: { sha: '123' } }],
                [
                    includeCommit,
                    notIncludeCommit,
                    'fix: first fixes',
                    {
                        message: 'feat: should not be here',
                        sha: '123',
                    },
                ],
            ),

            ...args,
        }),
    ).toMatchInlineSnapshot(`
    Object {
      "bumpType": "minor",
      "commitMessagesByNoteRule": Object {
        "minor": Array [
          "Add new feature within commit
    Description",
        ],
        "patch": Array [
          "This rare bug was finally fixed

    Some background for bug goes here... (#33343)",
          "This rare bug was finally fixed

    Some background for bug goes here... (#33343, #453)",
          "first fixes",
        ],
      },
      "nextVersion": "1.1.0",
    }
  `)
})
