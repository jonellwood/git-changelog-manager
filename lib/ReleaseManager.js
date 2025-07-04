/**
 * Release Manager - Handles version bumping and release creation
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const semver = require('semver');
const ChangelogManager = require('./ChangelogManager');

class ReleaseManager {
    constructor(config = {}) {
        this.config = {
            projectRoot: config.projectRoot || process.cwd(),
            changelogDir: config.changelogDir || 'changelog/releases',
            draftFileName: config.draftFileName || 'draft.md',
            packageJsonPath: config.packageJsonPath || 'package.json',
            githubToken: config.githubToken || process.env.GITHUB_TOKEN,
            githubRepository: config.githubRepository || process.env.GITHUB_REPOSITORY,
            ...config
        };
        
        this.changelogManager = new ChangelogManager(this.config);
        this.packageJsonFullPath = path.resolve(this.config.projectRoot, this.config.packageJsonPath);
        this.changelogDir = path.resolve(this.config.projectRoot, this.config.changelogDir);
    }

    /**
     * Get current version from package.json
     */
    async getCurrentVersion() {
        try {
            const packageJson = JSON.parse(await fs.readFile(this.packageJsonFullPath, 'utf8'));
            return packageJson.version || '0.0.0';
        } catch (error) {
            console.warn('Could not read package.json, defaulting to 0.0.0');
            return '0.0.0';
        }
    }

    /**
     * Bump version using semver
     */
    bumpVersion(version, type) {
        return semver.inc(version, type);
    }

    /**
     * Update package.json with new version
     */
    async updatePackageJson(newVersion) {
        try {
            const packageData = JSON.parse(await fs.readFile(this.packageJsonFullPath, 'utf8'));
            packageData.version = newVersion;
            await fs.writeFile(this.packageJsonFullPath, JSON.stringify(packageData, null, 2) + '\n');
            console.log(`Updated package.json to version ${newVersion}`);
        } catch (error) {
            console.warn('Could not update package.json:', error.message);
        }
    }

    /**
     * Update additional version files if specified in config
     */
    async updateAdditionalFiles(newVersion) {
        if (this.config.versionFiles) {
            for (const fileConfig of this.config.versionFiles) {
                try {
                    const filePath = path.resolve(this.config.projectRoot, fileConfig.path);
                    let content = await fs.readFile(filePath, 'utf8');
                    
                    if (fileConfig.pattern) {
                        // Replace using regex pattern
                        const regex = new RegExp(fileConfig.pattern, 'g');
                        content = content.replace(regex, fileConfig.replacement.replace('{{version}}', newVersion));
                    } else if (fileConfig.jsonPath) {
                        // Update JSON path
                        const data = JSON.parse(content);
                        this.setNestedProperty(data, fileConfig.jsonPath, newVersion);
                        content = JSON.stringify(data, null, 2) + '\n';
                    }
                    
                    await fs.writeFile(filePath, content);
                    console.log(`Updated ${fileConfig.path} to version ${newVersion}`);
                } catch (error) {
                    console.warn(`Could not update ${fileConfig.path}:`, error.message);
                }
            }
        }
    }

    /**
     * Set nested property in object using dot notation
     */
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    /**
     * Rename draft file to versioned file
     */
    async renameDraftFile(newVersion) {
        const draftPath = path.join(this.changelogDir, this.config.draftFileName);
        const newFilePath = path.join(this.changelogDir, `${newVersion}.md`);
        
        try {
            let content = await fs.readFile(draftPath, 'utf8');
            
            // Update frontmatter
            content = content.replace(/^---\n([\s\S]*?)---\n/, (match, frontmatter) => {
                const lines = frontmatter.split('\n');
                const updatedLines = lines.map(line => {
                    if (line.startsWith('version:')) {
                        return `version: ${newVersion}`;
                    }
                    if (line.startsWith('date:')) {
                        return `date: ${new Date().toISOString().split('T')[0]}`;
                    }
                    if (line.startsWith('tag:') && line.trim() === 'tag:') {
                        return `tag: v${newVersion}`;
                    }
                    return line;
                });
                return `---\n${updatedLines.join('\n')}\n---\n`;
            });
            
            // Remove **Unreleased** section header but keep content
            content = content.replace(/## \*\*Unreleased\*\*\n\n/, '');
            
            await fs.writeFile(newFilePath, content);
            await fs.unlink(draftPath);
            
            console.log(`Renamed draft to ${newVersion}.md`);
        } catch (error) {
            console.warn('Could not rename draft file:', error.message);
            // Create a basic release file if draft doesn't exist
            const basicContent = `---
version: ${newVersion}
date: ${new Date().toISOString().split('T')[0]}
tag: v${newVersion}
---

# Release ${newVersion}

- Release ${newVersion}
`;
            await fs.writeFile(newFilePath, basicContent);
            console.log(`Created basic release file: ${newVersion}.md`);
        }
    }

    /**
     * Create git tag
     */
    async createGitTag(version) {
        try {
            execSync(`git tag v${version}`, { 
                cwd: this.config.projectRoot,
                stdio: 'pipe'
            });
            console.log(`Created git tag: v${version}`);
        } catch (error) {
            console.warn(`Could not create git tag v${version}:`, error.message);
        }
    }

    /**
     * Commit and push changes
     */
    async commitAndPush(version) {
        try {
            execSync('git add .', { cwd: this.config.projectRoot });
            execSync(`git commit -m "Release ${version}"`, { cwd: this.config.projectRoot });
            execSync('git push', { cwd: this.config.projectRoot });
            execSync('git push --tags', { cwd: this.config.projectRoot });
            console.log('Changes committed and pushed to repository');
        } catch (error) {
            console.warn('Could not commit and push changes:', error.message);
        }
    }

    /**
     * Create GitHub release
     */
    async createGithubRelease(version) {
        if (!this.config.githubToken || !this.config.githubRepository) {
            console.log('GitHub token or repository not configured, skipping GitHub release');
            return;
        }

        try {
            const releaseFilePath = path.join(this.changelogDir, `${version}.md`);
            const releaseNotes = await fs.readFile(releaseFilePath, 'utf8');
            
            // Extract content after frontmatter
            const contentMatch = releaseNotes.match(/^---\n[\s\S]*?---\n([\s\S]*)$/);
            const body = contentMatch ? contentMatch[1].trim() : `Release ${version}`;

            const https = require('https');
            const data = JSON.stringify({
                tag_name: `v${version}`,
                name: `v${version}`,
                body: body,
                draft: false,
                prerelease: false
            });

            const options = {
                hostname: 'api.github.com',
                path: `/repos/${this.config.githubRepository}/releases`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.githubToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'changelog-manager',
                    'Content-Length': data.length
                }
            };

            return new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            console.log(`GitHub release created successfully: v${version}`);
                            resolve();
                        } else {
                            console.error(`GitHub API error: ${res.statusCode} ${responseData}`);
                            reject(new Error(`GitHub API error: ${res.statusCode}`));
                        }
                    });
                });

                req.on('error', (error) => {
                    console.error('Error creating GitHub release:', error);
                    reject(error);
                });

                req.write(data);
                req.end();
            });
        } catch (error) {
            console.warn('Could not create GitHub release:', error.message);
        }
    }

    /**
     * Start new draft
     */
    async startNewDraft() {
        const draftPath = path.join(this.changelogDir, this.config.draftFileName);
        
        // Get next version for the draft
        const nextVersion = await this.changelogManager.getNextVersion('patch');
        
        const content = `---
version: ${nextVersion}
date: ${new Date().toISOString().split('T')[0]}
tag: 
---

# Release ${nextVersion}

## **Unreleased**

<!-- New entries will be added here -->

`;
        
        await fs.writeFile(draftPath, content);
        console.log('Started new draft changelog');
    }

    /**
     * Perform complete release process
     */
    async release(bumpType = 'patch') {
        try {
            console.log('🚀 Starting release process...');
            
            // Ensure changelog directory exists
            await fs.mkdir(this.changelogDir, { recursive: true });
            
            const currentVersion = await this.getCurrentVersion();
            const newVersion = this.bumpVersion(currentVersion, bumpType);
            
            console.log(`📦 Bumping version from ${currentVersion} to ${newVersion}`);

            // Update package.json
            await this.updatePackageJson(newVersion);
            
            // Update additional version files
            await this.updateAdditionalFiles(newVersion);
            
            // Rename draft file
            await this.renameDraftFile(newVersion);
            
            // Create git tag
            await this.createGitTag(newVersion);
            
            // Commit and push changes
            await this.commitAndPush(newVersion);
            
            // Create GitHub release
            await this.createGithubRelease(newVersion);
            
            // Start new draft
            await this.startNewDraft();
            
            console.log(`✅ Release ${newVersion} completed successfully!`);
            return newVersion;
            
        } catch (error) {
            console.error('❌ Release process failed:', error.message);
            throw error;
        }
    }
}

module.exports = ReleaseManager;
