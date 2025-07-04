#!/usr/bin/env node

const { Command } = require('commander');
const { ReleaseManager } = require('../lib');
require('dotenv').config();

const program = new Command();

program
    .name('changelog-release')
    .description('Create a new release with version bump and changelog')
    .version('1.0.0')
    .option('-t, --type <type>', 'Version bump type (major, minor, patch)', 'patch')
    .option('-d, --dir <directory>', 'Changelog directory path', 'changelog/releases')
    .option('-f, --file <filename>', 'Draft filename', 'draft.md')
    .option('-r, --root <path>', 'Project root directory', process.cwd())
    .option('-p, --package <path>', 'Package.json path', 'package.json')
    .option('--github-token <token>', 'GitHub token (overrides env)')
    .option('--github-repo <repo>', 'GitHub repository (overrides env)')
    .option('--config <path>', 'Path to config file')
    .parse();

const options = program.opts();

// Validate bump type
const validTypes = ['major', 'minor', 'patch'];
if (!validTypes.includes(options.type)) {
    console.error(`Invalid version type: ${options.type}. Must be one of: ${validTypes.join(', ')}`);
    process.exit(1);
}

// Load config file if provided
let fileConfig = {};
if (options.config) {
    try {
        const fs = require('fs');
        const path = require('path');
        const configPath = path.resolve(options.config);
        fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error(`Could not load config file: ${error.message}`);
        process.exit(1);
    }
}

// Create config object
const config = {
    changelogDir: options.dir,
    draftFileName: options.file,
    projectRoot: options.root,
    packageJsonPath: options.package,
    githubToken: options.githubToken || process.env.GITHUB_TOKEN,
    githubRepository: options.githubRepo || process.env.GITHUB_REPOSITORY,
    ...fileConfig
};

// Create release manager and run
const manager = new ReleaseManager(config);

manager.release(options.type).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
