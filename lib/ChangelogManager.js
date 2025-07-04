/**
 * Changelog Manager - Core Library
 * 
 * This library provides the core functionality for managing changelogs:
 * - Detects the open release file (highest unreleased version or draft.md)
 * - Appends new commit messages under **Unreleased** section
 * - Uses OpenAI/Claude API to polish commit messages (with fallback)
 * - Guards against duplicate commit entries using hash check
 * - Supports custom messages
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');
const semver = require('semver');

class ChangelogManager {
    constructor(config = {}) {
        this.config = {
            changelogDir: config.changelogDir || 'changelog/releases',
            draftFileName: config.draftFileName || 'draft.md',
            aiApiKey: config.aiApiKey || process.env.OPENAI_API_KEY || process.env.CLAUDE_API_KEY,
            aiApiType: config.aiApiType || (process.env.OPENAI_API_KEY ? 'openai' : 'claude'),
            gitTimeRange: config.gitTimeRange || '1 day ago',
            projectRoot: config.projectRoot || process.cwd(),
            ...config
        };
        
        this.processedHashes = new Set();
        this.changelogDir = path.resolve(this.config.projectRoot, this.config.changelogDir);
        this.draftFile = path.join(this.changelogDir, this.config.draftFileName);
    }

    /**
     * Get all release files and find the highest version
     */
    async getHighestVersion() {
        try {
            const files = await fs.readdir(this.changelogDir);
            const versionFiles = files.filter(f => f.match(/^\d+\.\d+\.\d+\.md$/));
            
            if (versionFiles.length === 0) {
                return null;
            }

            // Sort versions to get the highest
            const versions = versionFiles.map(f => {
                const version = f.replace('.md', '');
                return { version, file: f, semver: semver.parse(version) };
            }).filter(v => v.semver !== null);

            versions.sort((a, b) => semver.rcompare(a.version, b.version));
            
            return versions[0];
        } catch (error) {
            console.error('Error reading changelog directory:', error.message);
            return null;
        }
    }

    /**
     * Detect the open release file (draft.md or highest unreleased version)
     */
    async detectOpenReleaseFile() {
        // Ensure changelog directory exists
        await fs.mkdir(this.changelogDir, { recursive: true });

        // Check if draft.md exists
        try {
            await fs.access(this.draftFile);
            return this.draftFile;
        } catch {
            // draft.md doesn't exist, check for highest version
        }

        const highestVersion = await this.getHighestVersion();
        if (highestVersion) {
            const versionFile = path.join(this.changelogDir, highestVersion.file);
            
            // Check if this version is already "released" (has a tag or is marked as released)
            try {
                const content = await fs.readFile(versionFile, 'utf8');
                const frontmatter = this.parseFrontmatter(content);
                
                // If no tag exists, consider it unreleased
                if (!frontmatter.tag) {
                    return versionFile;
                }
            } catch (error) {
                console.error('Error reading version file:', error.message);
            }
        }

        // If no suitable file found, create draft.md
        return this.draftFile;
    }

    /**
     * Parse frontmatter from markdown file
     */
    parseFrontmatter(content) {
        const lines = content.split('\n');
        const frontmatter = {};
        
        if (lines[0] === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                    break;
                }
                const [key, ...valueParts] = lines[i].split(':');
                if (key && valueParts.length > 0) {
                    frontmatter[key.trim()] = valueParts.join(':').trim();
                }
            }
        }
        
        return frontmatter;
    }

    /**
     * Get new commit messages since last changelog update
     */
    async getNewCommits() {
        try {
            // Get commits since last changelog update
            const result = execSync(
                `git log --pretty=format:"%H|%s" --since="${this.config.gitTimeRange}"`,
                { encoding: 'utf8', cwd: this.config.projectRoot }
            ).trim();

            if (!result) {
                return [];
            }

            const commits = result.split('\n').map(line => {
                const [hash, message] = line.split('|');
                return { hash, message };
            });

            // Filter out changelog update commits and merge commits
            return commits.filter(commit => {
                const msg = commit.message.toLowerCase();
                return !msg.includes('updated changelog') && 
                       !msg.includes('merge pull request') &&
                       !msg.includes('merge branch') &&
                       !msg.startsWith('merge ');
            });
        } catch (error) {
            console.error('Error getting git commits:', error.message);
            return [];
        }
    }

    /**
     * Create hash for commit message to prevent duplicates
     */
    createMessageHash(message) {
        return crypto.createHash('sha256').update(message).digest('hex').substring(0, 8);
    }

    /**
     * Check if commit message is already in changelog
     */
    async isMessageAlreadyInChangelog(releaseFile, messageHash) {
        try {
            const content = await fs.readFile(releaseFile, 'utf8');
            return content.includes(`<!-- hash:${messageHash} -->`);
        } catch {
            return false;
        }
    }

    /**
     * Polish commit messages using AI API
     */
    async polishCommitMessages(messages) {
        if (!this.config.aiApiKey || messages.length === 0) {
            // Fallback to raw messages
            return messages.map(msg => `- ${msg}`);
        }

        try {
            const prompt = `Please rephrase these commit messages into polished, professional changelog entries. Each should be a clear, concise bullet point describing what was changed or added:

${messages.join('\n')}

Return only the polished bullet points, one per line, starting with "- ".`;

            let polishedMessages;
            
            if (this.config.aiApiType === 'openai') {
                polishedMessages = await this.callOpenAI(prompt);
            } else {
                polishedMessages = await this.callClaude(prompt);
            }

            return polishedMessages.split('\n').filter(line => line.trim().startsWith('- '));
        } catch (error) {
            console.warn('AI API failed, using raw messages:', error.message);
            // Fallback to raw messages
            return messages.map(msg => `- ${msg}`);
        }
    }

    /**
     * Call OpenAI API
     */
    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.aiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that writes clear, professional changelog entries.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 500
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Call Claude API
     */
    async callClaude(prompt) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.aiApiKey}`,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        const data = await response.json();
        return data.content[0].text;
    }

    /**
     * Get next version number
     */
    async getNextVersion(bumpType = 'patch') {
        const highestVersion = await this.getHighestVersion();
        let nextVersion = '0.1.0';
        
        if (highestVersion) {
            nextVersion = semver.inc(highestVersion.version, bumpType);
        }
        
        return nextVersion;
    }

    /**
     * Create new unreleased file if it doesn't exist
     */
    async createUnreleasedFile(filePath) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        // Get next version number
        const nextVersion = await this.getNextVersion();

        const content = `---
version: ${nextVersion}
date: ${dateStr}
tag: 
---

# Release ${nextVersion}

## **Unreleased**

<!-- New entries will be added here -->

`;

        await fs.writeFile(filePath, content, 'utf8');
        console.log(`Created new unreleased file: ${filePath}`);
        return filePath;
    }

    /**
     * Update changelog file with new entries
     */
    async updateChangelogFile(filePath, newEntries) {
        try {
            let content;
            
            // Check if file exists
            try {
                content = await fs.readFile(filePath, 'utf8');
            } catch {
                // File doesn't exist, create it
                await this.createUnreleasedFile(filePath);
                content = await fs.readFile(filePath, 'utf8');
            }

            // Find the **Unreleased** section
            const lines = content.split('\n');
            let unreleasedIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('**Unreleased**')) {
                    unreleasedIndex = i;
                    break;
                }
            }

            if (unreleasedIndex === -1) {
                // Add **Unreleased** section if it doesn't exist
                const insertIndex = lines.findIndex(line => line.startsWith('# Release'));
                if (insertIndex !== -1) {
                    lines.splice(insertIndex + 1, 0, '', '## **Unreleased**', '');
                    unreleasedIndex = insertIndex + 2;
                } else {
                    // Append to end of file
                    lines.push('', '## **Unreleased**', '');
                    unreleasedIndex = lines.length - 1;
                }
            }

            // Insert new entries after **Unreleased**
            const insertIndex = unreleasedIndex + 1;
            const newLines = [];
            
            for (const entry of newEntries) {
                const hash = this.createMessageHash(entry.message);
                newLines.push(`${entry.polished} <!-- hash:${hash} -->`);
            }

            lines.splice(insertIndex, 0, ...newLines);

            await fs.writeFile(filePath, lines.join('\n'), 'utf8');
            console.log(`Updated changelog: ${filePath}`);
            console.log(`Added ${newEntries.length} new entries`);
        } catch (error) {
            console.error('Error updating changelog file:', error.message);
            throw error;
        }
    }

    /**
     * Add entries to changelog
     */
    async addToChangelog(options = {}) {
        try {
            console.log('🚀 Starting changelog update...');
            
            // Detect the open release file
            const releaseFile = await this.detectOpenReleaseFile();
            console.log(`📝 Using release file: ${releaseFile}`);

            // Get new commits or use custom message
            let newEntries = [];
            
            if (options.customMessage) {
                const messageHash = this.createMessageHash(options.customMessage);
                
                // Check if message already exists
                if (await this.isMessageAlreadyInChangelog(releaseFile, messageHash)) {
                    console.log('⚠️  Message already exists in changelog, skipping...');
                    return;
                }
                
                const polished = await this.polishCommitMessages([options.customMessage]);
                newEntries = [{
                    message: options.customMessage,
                    polished: polished[0] || `- ${options.customMessage}`
                }];
            } else {
                const commits = await this.getNewCommits();
                console.log(`📋 Found ${commits.length} recent commits`);

                // Filter out commits that are already in the changelog
                const filteredCommits = [];
                for (const commit of commits) {
                    const messageHash = this.createMessageHash(commit.message);
                    if (!await this.isMessageAlreadyInChangelog(releaseFile, messageHash)) {
                        filteredCommits.push(commit);
                    }
                }

                console.log(`📋 ${filteredCommits.length} new commits to add`);

                if (filteredCommits.length === 0) {
                    console.log('✅ No new commits to add to changelog');
                    return;
                }

                // Polish the commit messages
                const messages = filteredCommits.map(c => c.message);
                const polished = await this.polishCommitMessages(messages);
                
                newEntries = filteredCommits.map((commit, index) => ({
                    message: commit.message,
                    polished: polished[index] || `- ${commit.message}`
                }));
            }

            // Update the changelog file
            await this.updateChangelogFile(releaseFile, newEntries);
            
            console.log('✅ Changelog updated successfully!');
            
        } catch (error) {
            console.error('❌ Error:', error.message);
            throw error;
        }
    }
}

module.exports = ChangelogManager;
