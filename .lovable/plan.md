# Add 8 new networks to the social finder

Discord, Twitch, Substack, Telegram, Reddit, Patreon, Behance, Dribbble. Each new result shows up on the same cards as today: evidence lines, Verified/unverified badge, strength label, last checked, copy handle and copy URL, and is included in "copy all verified handles", share links, saved lists and the assistant (MCP) tool.

## What each network recognizes

| Network | Profile links recognized | Copy tag | Reciprocal check |
|---|---|---|---|
| Discord | discord.gg/CODE, discord.com/invite/CODE | invite code (no @) | Invite page public; counted only when found on the brand's own site or JSON-LD (invites rarely link back) |
| Twitch | twitch.tv/NAME | @NAME | Yes, profile page |
| Substack | NAME.substack.com, substack.com/@NAME | @NAME | Yes |
| Telegram | t.me/NAME, telegram.me/NAME (skips joinchat/+invites, share) | @NAME | Yes, t.me preview page |
| Reddit | reddit.com/r/NAME, reddit.com/user/NAME or /u/NAME | r/NAME or u/NAME | Yes, public JSON about-page |
| Patreon | patreon.com/NAME, patreon.com/c/NAME | @NAME | Yes |
| Behance | behance.net/NAME | @NAME | Yes |
| Dribbble | dribbble.com/NAME (skips shots, jobs, etc.) | @NAME | Yes |

"Reciprocal check" = for search/guessed results, the profile page is fetched and the result is only kept when it links back to the brand's domain; otherwise it stays unverified, same rule as existing networks. Discord gets no guessed-handle probe since invite codes can't be guessed.

## Technical details

- All rules added only in `src/lib/social/platforms.ts` (new `PlatformId`s, `parse`, optional `probe`, reserved words), plus hosts in `SOCIAL_HOSTS`. Substack needs subdomain host matching (`*.substack.com`, excluding `www`/`on`).
- Reddit tags differ by type (r/ vs u/); handle stays unique per type.
- Check UI icon/name maps (cards, share view, MCP output, agent docs in `src/lib/agent/docs.ts`, llms.txt platform list) and add the 8 entries with Font Awesome free brand icons (discord, twitch, telegram, reddit, patreon, behance, dribbble; Substack has no free brand icon, use a generic newspaper icon).
- Unit tests: one per network for URL parsing (accepted and rejected paths) and tag format.
- Update homepage/FAQ copy listing supported networks only where it enumerates them.
- Publish needed for live site.
