import { extractChangelogFromGithub } from '../src/library/changelogFromGithub'
import { OctokitRepoWithUrl } from '../src/library/types'

let mockedReleases = {}

vi.mock('../src/library/queryRepositoryReleases', () => ({
    queryRepositoryReleases() {
        return mockedReleases
    },
}))

const mockReleasesOnce = (releases: { name: string; description: string }[]) => {
    mockedReleases = {
        totalCount: releases.length,
        releases: releases.map(({ name, description }) => ({
            createdAt: Date.now(),
            description,
            name,
            tagName: name,
        })),
    }
}

const dummyRepo: OctokitRepoWithUrl = {
    owner: 'owner',
    repo: 'test',
    url: 'https://github.com/owner/test',
}

test('Generates advaned changelog', async () => {
    mockReleasesOnce([
        {
            name: 'v0.0.2',
            description: `<!-- bump-type:patch -->
### Bug Fixes

- fix something cool (#9, #10)
- another fix [\`919b378\`](https://github.com/some/repo/commit/919b378a3d01a3ff7ab1952c9ab792b84e0234be)
- yes 919b378a3d01a3ff7ab1952c9ab792b84e0234be`,
        },
        {
            name: 'v0.0.1',
            description: `
### New Features
- other lines (#9)
- ### Introduce new snippet constrain! Meet **otherLines**!
`,
        },
    ])
    const changelog = await extractChangelogFromGithub(dummyRepo)
    expect(changelog).toMatchInlineSnapshot(`
      {
        "markdown": "
      ## [v0.0.2](https://github.com/owner/test/releases/tag/v0.0.2) - 2022-07-26
      <!-- bump-type:patch -->
      ### Bug Fixes

      - fix something cool ([#9](https://github.com/owner/test/issues/9}), [#10](https://github.com/owner/test/issues/10}))
      - another fix [\`919b378\`](https://github.com/some/repo/commit/919b378a3d01a3ff7ab1952c9ab792b84e0234be)
      - yes [\`919b378\`](https://github.com/owner/test/commit/919b378a3d01a3ff7ab1952c9ab792b84e0234be)
      ## [v0.0.1](https://github.com/owner/test/releases/tag/v0.0.1) - 2022-07-26

      ### New Features
      - other lines ([#9](https://github.com/owner/test/issues/9}))
      - ### Introduce new snippet constrain! Meet **otherLines**!
      ",
        "totalCount": 2,
      }
    `)
})
