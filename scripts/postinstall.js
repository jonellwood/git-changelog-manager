#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Automatically add changelog scripts to the user's package.json after installation
 */
function addChangelogScripts() {
  try {
    // Find the user's package.json (go up directories until we find it)
    let currentDir = process.cwd();
    let packageJsonPath = null;
    
    // Look for package.json in parent directories (since we're in node_modules)
    for (let i = 0; i < 5; i++) {
      const possiblePath = path.join(currentDir, 'package.json');
      if (fs.existsSync(possiblePath)) {
        // Make sure this isn't our own package.json
        const pkg = JSON.parse(fs.readFileSync(possiblePath, 'utf8'));
        if (pkg.name !== 'git-changelog-manager') {
          packageJsonPath = possiblePath;
          break;
        }
      }
      currentDir = path.dirname(currentDir);
    }

    if (!packageJsonPath) {
      console.log('📦 git-changelog-manager: Could not locate user package.json');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Initialize scripts object if it doesn't exist
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Scripts to add
    const changelogScripts = {
      'changelog:add': 'changelog-add',
      'changelog:release': 'changelog-release'
    };

    let scriptsAdded = [];
    let scriptsSkipped = [];

    // Add scripts that don't already exist
    for (const [scriptName, command] of Object.entries(changelogScripts)) {
      if (!packageJson.scripts[scriptName]) {
        packageJson.scripts[scriptName] = command;
        scriptsAdded.push(scriptName);
      } else {
        scriptsSkipped.push(scriptName);
      }
    }

    // Write back to package.json if changes were made
    if (scriptsAdded.length > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      console.log('✅ git-changelog-manager: Added npm scripts to package.json');
      console.log(`   Added: ${scriptsAdded.join(', ')}`);
      
      if (scriptsSkipped.length > 0) {
        console.log(`   Skipped (already exist): ${scriptsSkipped.join(', ')}`);
      }
      
      console.log('\n📝 Usage:');
      console.log('   npm run changelog:add        # Add recent commits to changelog');
      console.log('   npm run changelog:release    # Create a new release');
      console.log('   npx changelog-init           # Initialize changelog (first time setup)');
    } else {
      console.log('📦 git-changelog-manager: npm scripts already exist in package.json');
    }

  } catch (error) {
    console.log('⚠️  git-changelog-manager: Could not auto-add npm scripts:', error.message);
    console.log('   You can manually add these scripts to your package.json:');
    console.log('   "changelog:add": "changelog-add"');
    console.log('   "changelog:release": "changelog-release"');
  }
}

// Only run if this is being executed directly (not required)
if (require.main === module) {
  addChangelogScripts();
}

module.exports = addChangelogScripts;
