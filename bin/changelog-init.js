#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

const program = new Command();

program
    .name('changelog-init')
    .description('Initialize changelog-manager in your project')
    .version('1.0.0')
    .option('-r, --root <path>', 'Project root directory', process.cwd())
    .option('-d, --dir <directory>', 'Changelog directory path', 'changelog/releases')
    .option('--skip-env', 'Skip .env file creation')
    .option('--skip-config', 'Skip config file creation')
    .parse();

const options = program.opts();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}

async function init() {
    try {
        console.log('🚀 Initializing changelog-manager...\n');

        const projectRoot = path.resolve(options.root);
        const changelogDir = path.resolve(projectRoot, options.dir);

        // Create changelog directory
        await fs.mkdir(changelogDir, { recursive: true });
        console.log(`✅ Created changelog directory: ${options.dir}`);

        // Create initial draft file
        const draftPath = path.join(changelogDir, 'draft.md');
        try {
            await fs.access(draftPath);
            console.log('📝 Draft file already exists, skipping...');
        } catch {
            const draftContent = `---
version: 0.1.0
date: ${new Date().toISOString().split('T')[0]}
tag: 
---

# Release 0.1.0

## **Unreleased**

<!-- New entries will be added here -->

`;
            await fs.writeFile(draftPath, draftContent);
            console.log('📝 Created initial draft file');
        }

        // Create .env file if requested
        if (!options.skipEnv) {
            const envPath = path.join(projectRoot, '.env');
            try {
                await fs.access(envPath);
                console.log('⚙️  .env file already exists, skipping...');
            } catch {
                console.log('\n⚙️  Setting up environment variables...');
                
                const openaiKey = await question('OpenAI API Key (optional): ');
                const claudeKey = await question('Claude API Key (optional): ');
                const githubToken = await question('GitHub Token (optional): ');
                const githubRepo = await question('GitHub Repository (e.g., user/repo, optional): ');

                let envContent = '# Changelog Manager Environment Variables\n\n';
                
                if (openaiKey) envContent += `OPENAI_API_KEY=${openaiKey}\n`;
                if (claudeKey) envContent += `CLAUDE_API_KEY=${claudeKey}\n`;
                if (githubToken) envContent += `GITHUB_TOKEN=${githubToken}\n`;
                if (githubRepo) envContent += `GITHUB_REPOSITORY=${githubRepo}\n`;

                await fs.writeFile(envPath, envContent);
                console.log('✅ Created .env file');
            }
        }

        // Create config file if requested
        if (!options.skipConfig) {
            const configPath = path.join(projectRoot, 'changelog.config.json');
            try {
                await fs.access(configPath);
                console.log('📋 Config file already exists, skipping...');
            } catch {
                const config = {
                    changelogDir: options.dir,
                    draftFileName: "draft.md",
                    gitTimeRange: "1 day ago",
                    versionFiles: [
                        {
                            path: "package.json",
                            jsonPath: "version"
                        }
                    ]
                };

                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                console.log('📋 Created config file');
            }
        }

        // Update package.json scripts if it exists
        const packageJsonPath = path.join(projectRoot, 'package.json');
        try {
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }

            let scriptsAdded = false;
            
            if (!packageJson.scripts['changelog:add']) {
                packageJson.scripts['changelog:add'] = 'changelog-add';
                scriptsAdded = true;
            }
            
            if (!packageJson.scripts['changelog:release']) {
                packageJson.scripts['changelog:release'] = 'changelog-release';
                scriptsAdded = true;
            }

            if (scriptsAdded) {
                await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
                console.log('📦 Added npm scripts to package.json');
            } else {
                console.log('📦 npm scripts already exist in package.json');
            }
        } catch {
            console.log('📦 No package.json found, skipping script addition');
        }

        console.log('\n✅ Changelog-manager initialized successfully!');
        console.log('\nUsage:');
        console.log('  npm run changelog:add        # Add recent commits to changelog');
        console.log('  npm run changelog:release    # Create a new release');
        console.log('  changelog-add -m "message"   # Add custom message');
        console.log('  changelog-release -t minor   # Create minor release');

    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

init();
