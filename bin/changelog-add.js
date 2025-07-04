#!/usr/bin/env node

const { Command } = require('commander');
const { ChangelogManager } = require('../lib');
require('dotenv').config();

const program = new Command();

program
    .name('changelog-add')
    .description('Add entries to changelog from git commits or custom messages')
    .version('1.0.0')
    .option('-m, --message <message>', 'Custom message to add to changelog')
    .option('-d, --dir <directory>', 'Changelog directory path', 'changelog/releases')
    .option('-f, --file <filename>', 'Draft filename', 'draft.md')
    .option('-t, --time <timerange>', 'Git time range for commits', '1 day ago')
    .option('-r, --root <path>', 'Project root directory', process.cwd())
    .option('--openai-key <key>', 'OpenAI API key (overrides env)')
    .option('--claude-key <key>', 'Claude API key (overrides env)')
    .option('--gemini-key <key>', 'Gemini API key (overrides env)')
    .option('--emojis', 'Enable emoji-enhanced changelog entries')
    .option('--no-emojis', 'Disable emoji-enhanced changelog entries')
    .parse();

const options = program.opts();

// Create config object
const config = {
    changelogDir: options.dir,
    draftFileName: options.file,
    gitTimeRange: options.time,
    projectRoot: options.root
};

// Set AI API key if provided
if (options.openaiKey) {
    config.aiApiKey = options.openaiKey;
    config.aiApiType = 'openai';
} else if (options.claudeKey) {
    config.aiApiKey = options.claudeKey;
    config.aiApiType = 'claude';
} else if (options.geminiKey) {
    config.aiApiKey = options.geminiKey;
    config.aiApiType = 'gemini';
}

// Set emoji preference if provided
if (options.emojis !== undefined) {
    config.useEmojis = options.emojis;
}

// Create changelog manager and run
const manager = new ChangelogManager(config);

manager.addToChangelog({
    customMessage: options.message
}).catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});
