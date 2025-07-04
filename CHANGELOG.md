# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-07-04

### Added
- Initial release of changelog-manager
- Automated changelog generation from git commits
- AI-powered commit message polishing (OpenAI and Claude support)
- Semantic versioning with automatic version bumping
- GitHub integration for automated release creation
- Hash-based duplicate detection for commit messages
- Comprehensive CLI interface with three commands:
  - `changelog-init`: Initialize changelog-manager in a project
  - `changelog-add`: Add entries to changelog from commits or custom messages
  - `changelog-release`: Create new releases with version bumping
- Configurable via environment variables, config files, or CLI options
- Support for updating multiple version files during releases
- Markdown-based changelog files with frontmatter
- Draft file system for unreleased changes
- Project templates and examples
- Full programmatic API for Node.js applications

### Features
- 🚀 Automated Changelog Generation
- 🤖 AI-Powered Message Polishing
- 📝 Markdown-Based Release Notes
- 🔄 Version Management
- 🐙 GitHub Integration
- 🎯 Duplicate Detection
- ⚙️ Extensive Configuration Options
