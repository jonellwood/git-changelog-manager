# Git Changelog Manager

A comprehensive changelog management tool for automated release notes and version management. This package helps you maintain professional changelogs by automatically extracting git commit messages, polishing them with AI (optional), and managing version releases.

## Features

- 🚀 **Automated Changelog Generation**: Extract and format git commits into professional changelog entries
- 🤖 **AI-Powered Message Polishing**: Uses OpenAI or Claude APIs to improve commit messages (optional)
- 📝 **Markdown-Based**: Uses markdown files with frontmatter for structured release notes
- 🔄 **Version Management**: Automated semantic versioning with git tagging
- 🐙 **GitHub Integration**: Automatically create GitHub releases
- 🎯 **Duplicate Detection**: Hash-based duplicate prevention for commit messages
- ⚙️ **Configurable**: Extensive configuration options via files, environment variables, or CLI options

## Installation

```bash
npm install -g git-changelog-manager
```

Or install locally in your project:

```bash
npm install --save-dev git-changelog-manager
```

## Quick Start

1. **Initialize in your project:**
```bash
changelog-init
```

2. **Add recent commits to changelog:**
```bash
changelog-add
```

3. **Create a release:**
```bash
changelog-release --type patch
```

## CLI Commands

### `changelog-init`

Initialize changelog-manager in your project.

```bash
changelog-init [options]

Options:
  -r, --root <path>        Project root directory (default: current directory)
  -d, --dir <directory>    Changelog directory path (default: "changelog/releases")
  --skip-env              Skip .env file creation
  --skip-config           Skip config file creation
  -h, --help              Display help
```

### `changelog-add`

Add entries to changelog from git commits or custom messages.

```bash
changelog-add [options]

Options:
  -m, --message <message>  Custom message to add to changelog
  -d, --dir <directory>    Changelog directory path (default: "changelog/releases")
  -f, --file <filename>    Draft filename (default: "draft.md")
  -t, --time <timerange>   Git time range for commits (default: "1 day ago")
  -r, --root <path>        Project root directory
  --openai-key <key>       OpenAI API key (overrides env)
  --claude-key <key>       Claude API key (overrides env)
  -h, --help              Display help
```

### `changelog-release`

Create a new release with version bump and changelog.

```bash
changelog-release [options]

Options:
  -t, --type <type>        Version bump type: major, minor, patch (default: "patch")
  -d, --dir <directory>    Changelog directory path (default: "changelog/releases")
  -f, --file <filename>    Draft filename (default: "draft.md")
  -r, --root <path>        Project root directory
  -p, --package <path>     Package.json path (default: "package.json")
  --github-token <token>   GitHub token (overrides env)
  --github-repo <repo>     GitHub repository (overrides env)
  --config <path>          Path to config file
  --skip-pending-check     Skip checking for pending commits
  -h, --help              Display help
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# AI API Keys (optional)
OPENAI_API_KEY=your_openai_api_key
CLAUDE_API_KEY=your_claude_api_key

# GitHub Integration (optional)
GITHUB_TOKEN=your_github_token
GITHUB_REPOSITORY=username/repository-name
```

### Config File

Create `changelog.config.json` in your project root:

```json
{
  "changelogDir": "changelog/releases",
  "draftFileName": "draft.md",
  "gitTimeRange": "1 day ago",
  "versionFiles": [
    {
      "path": "package.json",
      "jsonPath": "version"
    },
    {
      "path": "src/version.js",
      "pattern": "version: ['\"]([^'\"]+)['\"]",
      "replacement": "version: '{{version}}'"
    }
  ]
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `changelogDir` | Directory for changelog files | `changelog/releases` |
| `draftFileName` | Name of draft file | `draft.md` |
| `gitTimeRange` | Time range for git commits | `1 day ago` |
| `projectRoot` | Project root directory | `process.cwd()` |
| `packageJsonPath` | Path to package.json | `package.json` |
| `aiApiKey` | AI API key | From environment |
| `aiApiType` | AI API type (`openai` or `claude`) | Auto-detected |
| `githubToken` | GitHub token | `GITHUB_TOKEN` env var |
| `githubRepository` | GitHub repository | `GITHUB_REPOSITORY` env var |
| `versionFiles` | Additional files to update with version | `[]` |

## Usage Examples

### Basic Usage

```bash
# Add recent commits to changelog
changelog-add

# Add custom message
changelog-add -m "Fixed critical bug in authentication"

# Create patch release
changelog-release

# Create minor release
changelog-release --type minor
```

### Advanced Usage

```bash
# Use custom git time range
changelog-add -t "3 days ago"

# Use custom directories
changelog-add -d "docs/releases" -f "unreleased.md"

# Release with custom config
changelog-release --config ./my-config.json

# Skip pending commits check
changelog-release --type minor --skip-pending-check
```

## Recommended Workflow

The package follows a two-step workflow:

1. **Add commits to changelog**: Use `changelog-add` to stage your recent commits into the draft changelog
2. **Create release**: Use `changelog-release` to bump version, create tags, and publish

```bash
# After making commits
changelog-add

# Review the draft changelog
cat changelog/releases/draft.md

# Create a release
changelog-release --type minor
```

### Automatic Pending Check

When you run `changelog-release`, the tool automatically checks if you have commits that haven't been added to the changelog yet. If found, it will:

1. Show a warning about pending commits
2. Ask if you want to run `changelog-add` first
3. If you choose yes, it will add the commits and continue with the release
4. If you choose no, it will proceed with the release without adding the pending commits

You can skip this check with `--skip-pending-check` if needed.

```

## Programmatic Usage

You can also use the package programmatically in your Node.js applications:

```javascript
const { ChangelogManager, ReleaseManager } = require('git-changelog-manager');

// Create changelog manager
const changelog = new ChangelogManager({
  changelogDir: 'changelog/releases',
  aiApiKey: process.env.OPENAI_API_KEY
});

// Add commits to changelog
await changelog.addToChangelog();

// Create release manager
const release = new ReleaseManager({
  githubToken: process.env.GITHUB_TOKEN,
  githubRepository: 'user/repo'
});

// Create a release
await release.release('minor');
```

## File Structure

The package creates the following structure:

```
your-project/
├── changelog/
│   └── releases/
│       ├── draft.md          # Current unreleased changes
│       ├── 1.0.0.md         # Released version files
│       ├── 1.0.1.md
│       └── ...
├── .env                      # Environment variables
├── changelog.config.json     # Configuration file
└── package.json             # Updated with scripts
```

### Release File Format

Each release file uses markdown with frontmatter:

```markdown
---
version: 1.0.1
date: 2024-07-04
tag: v1.0.1
---

# Release 1.0.1

- Fixed authentication bug <!-- hash:abc123 -->
- Added new user dashboard <!-- hash:def456 -->
- Improved performance <!-- hash:ghi789 -->
```

## AI Integration

The package can automatically polish your git commit messages using AI:

- **OpenAI GPT-3.5**: Set `OPENAI_API_KEY` environment variable
- **Claude**: Set `CLAUDE_API_KEY` environment variable
- **Fallback**: If no AI key is provided, raw commit messages are used

The AI will transform commit messages like:
- `"fix: auth bug"` → `"- Fixed authentication bug"`
- `"feat: user dashboard"` → `"- Added new user dashboard"`

## GitHub Integration

When properly configured, the package will:
1. Create git tags for releases
2. Push changes to your repository
3. Create GitHub releases with changelog content
4. Link releases to git tags

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
