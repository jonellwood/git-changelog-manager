#!/usr/bin/env node

const { Command } = require('commander');
const { ReleaseManager, ChangelogManager } = require('../lib');
const readline = require('readline');
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
    .option('--skip-pending-check', 'Skip checking for pending commits')
    .parse();

const options = program.opts();

// Helper function to prompt user
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

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

// Main execution function
async function main() {
    try {
        // Check for pending commits unless skipped
        if (!options.skipPendingCheck) {
            const changelogManager = new ChangelogManager(config);
            const hasPending = await changelogManager.hasPendingCommits();
            
            if (hasPending) {
                console.log('\n⚠️  You have commits that haven\'t been added to the changelog yet.');
                const answer = await prompt('Would you like to run changelog:add first? (y/n): ');
                
                if (answer === 'y' || answer === 'yes') {
                    console.log('\n📝 Running changelog:add...');
                    await changelogManager.addToChangelog();
                    console.log('\n✅ Changelog updated. Continuing with release...\n');
                } else {
                    console.log('\n⚠️  Proceeding with release without adding pending commits...\n');
                }
            }
        }
        
        // Create release manager and run
        const manager = new ReleaseManager(config);
        await manager.release(options.type);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run main function
main();
