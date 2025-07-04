# Publishing Guide for git-changelog-manager

This document explains how to publish and use the changelog-manager package.

## Package Structure

The package is now ready at `/Users/jonathanellwood/git-changelog-manager/` with the following structure:

```
changelog-manager/
├── bin/                          # CLI executables
│   ├── changelog-add.js         # Add entries command
│   ├── changelog-init.js        # Initialize command
│   └── changelog-release.js     # Release command
├── lib/                         # Core library
│   ├── ChangelogManager.js      # Main changelog functionality
│   ├── ReleaseManager.js        # Release management
│   └── index.js                 # Package exports
├── templates/                   # Empty (for future templates)
├── .env.example                 # Environment variables template
├── .gitignore                   # Git ignore file
├── CHANGELOG.md                 # Package changelog
├── changelog.config.example.json # Config file example
├── LICENSE                      # MIT License
├── package.json                 # Package configuration
├── PUBLISHING.md               # This file
└── README.md                   # Documentation
```

## Dependencies

The package includes these dependencies:
- `dotenv`: ^16.3.1 - Environment variable loading
- `commander`: ^11.1.0 - CLI argument parsing
- `semver`: ^7.5.4 - Semantic versioning utilities

## Publishing to npm

1. **Login to npm:**
   ```bash
   npm login
   ```

2. **Navigate to the package directory:**
   ```bash
   cd /Users/jonathanellwood/git-changelog-manager
   ```

3. **Publish the package:**
   ```bash
   npm publish
   ```

   If the name is taken, update the name in `package.json` to something like:
   - `@jonathanellwood/changelog-manager`
   - `changelog-manager-pro`
   - `auto-changelog-manager`

## Installation

After publishing, users can install it globally:

```bash
npm install -g git-changelog-manager
```

Or locally in a project:

```bash
npm install --save-dev git-changelog-manager
```

## Usage Examples

### Initialize in a new project
```bash
changelog-init
```

### Add commits to changelog
```bash
changelog-add
```

### Create a release
```bash
changelog-release --type patch
```

### Add custom message
```bash
changelog-add -m "Fixed critical security vulnerability"
```

## Environment Variables

Users need to set up these optional environment variables:

```env
# For AI message polishing
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=...

# For GitHub integration
GITHUB_TOKEN=ghp_...
GITHUB_REPOSITORY=username/repo-name
```

## Configuration

Users can create a `changelog.config.json` file:

```json
{
  "changelogDir": "changelog/releases",
  "draftFileName": "draft.md",
  "gitTimeRange": "1 day ago",
  "versionFiles": [
    {
      "path": "package.json",
      "jsonPath": "version"
    }
  ]
}
```

## Key Features Implemented

✅ **Core Functionality:**
- Automated changelog generation from git commits
- AI-powered message polishing (OpenAI/Claude)
- Semantic versioning with git tagging
- Hash-based duplicate detection
- GitHub release creation

✅ **CLI Commands:**
- `changelog-init` - Project initialization
- `changelog-add` - Add changelog entries
- `changelog-release` - Create releases

✅ **Configuration Options:**
- Environment variables (`.env` support)
- Config files (`changelog.config.json`)
- CLI options override everything

✅ **Universal Features:**
- Works with any git repository
- Configurable paths and filenames
- Multiple version file updates
- Cross-platform compatible

## Differences from Original

The npm package version includes these improvements over the original:

1. **Universal Configuration**: Uses `.env` and config files instead of hardcoded paths
2. **Better CLI**: Uses `commander` for proper argument parsing
3. **Modular Design**: Separate classes for different functionality
4. **Error Handling**: More robust error handling and fallbacks
5. **Documentation**: Comprehensive README and examples
6. **Flexibility**: Supports multiple project structures and workflows

## Testing

The package has been tested and confirmed working. The initialization command successfully:
- Creates changelog directory structure
- Generates initial draft file
- Updates package.json with npm scripts
- Handles existing files gracefully

## Next Steps

1. Publish to npm registry
2. Create GitHub repository for the package
3. Add automated testing
4. Consider adding more AI providers
5. Add template system for different changelog formats
6. Create VS Code extension integration

The package is ready for publication and use by the wider development community!
