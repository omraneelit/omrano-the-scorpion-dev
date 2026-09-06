# Automated Godot releases and website badges

The website reads `data/game-updates.json` and shows `NEW UPDATE` for seven days after a successful itch.io release. No database or backend is required.

## One-time GitHub setup

1. In each game repository, add an Actions secret named `BUTLER_API_KEY`. Create it from the itch.io API keys page; Butler documents this environment variable for CI.
2. Create a fine-grained GitHub personal access token restricted to `omraneelit/omrano-the-scorpion-dev` with **Contents: write** permission.
3. Add that token to each game repository as the Actions secret `WEBSITE_DISPATCH_TOKEN`.
4. Ensure each Godot project commits `export_presets.cfg` and that its preset names match the release workflow configuration.

## Caller workflow for a game repository

Create `.github/workflows/release.yml` in the game repository. This example publishes Windows and Android builds when a version tag is pushed:

```yaml
name: Publish release

on:
  push:
    tags: ["v*"]

jobs:
  release:
    uses: omraneelit/omrano-the-scorpion-dev/.github/workflows/publish-godot-to-itch.yml@master
    with:
      game_id: zero-hour-protocol
      itch_target: omrane-el-it/zero-hour-protocol
      godot_version: "4.7"
      builds: >-
        [
          {"preset":"Windows Desktop","path":"build/windows/ZeroHourProtocol.exe","source":"build/windows","channel":"windows"},
          {"preset":"Android","path":"build/android/ZeroHourProtocol.apk","source":"build/android/ZeroHourProtocol.apk","channel":"android"}
        ]
    secrets:
      BUTLER_API_KEY: ${{ secrets.BUTLER_API_KEY }}
      WEBSITE_DISPATCH_TOKEN: ${{ secrets.WEBSITE_DISPATCH_TOKEN }}
```

Change `game_id`, `itch_target`, Godot version, and the build entries once for each game. `game_id` must match the game page filename; for example, `games/zero-hour-protocol.html` uses `zero-hour-protocol`.

Push a tag to release:

```text
git tag v1.2.0
git push origin v1.2.0
```

The reusable workflow only notifies the website after every configured Butler upload succeeds. The website receiver can also be tested manually from **Actions → Record published game update → Run workflow**.
