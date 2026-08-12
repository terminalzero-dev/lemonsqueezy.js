# Issue tracker: GitHub

Issues and specs live in this repository's GitHub Issues. Use the `gh` CLI and infer the repository from `git remote -v`.

## Conventions

- Create: `gh issue create`
- Read: `gh issue view <number> --comments`
- List: `gh issue list`
- Comment: `gh issue comment <number>`
- Label: `gh issue edit <number> --add-label/--remove-label`
- Close: `gh issue close <number>`

## Pull requests as a triage surface

PRs as a request surface: no.

## Skill terminology

- “Publish to the issue tracker” means creating a GitHub Issue.
- “Fetch the relevant ticket” means reading the Issue body, comments, and labels.
- A Wayfinder map is an Issue labelled `wayfinder:map`.
- Wayfinder child tickets use `wayfinder:<type>` labels and native GitHub sub-issues where available.
- Blocking relationships use native GitHub Issue dependencies where available.
