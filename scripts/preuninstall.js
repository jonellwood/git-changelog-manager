#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Remove changelog scripts from the user's package.json before uninstallation
 */
function removeChangelogScripts() {
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
      console.log('📦 git-changelog-manager: Could not locate user package.json for cleanup');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check if scripts object exists
    if (!packageJson.scripts) {
      console.log('📦 git-changelog-manager: No scripts to remove');
      return;
    }

    // Scripts to remove
    const changelogScripts = ['changelog:add', 'changelog:release'];
    let scriptsRemoved = [];
    let scriptsNotFound = [];

    // Remove scripts that exist and match our exact commands
    for (const scriptName of changelogScripts) {
      if (packageJson.scripts[scriptName]) {
        // Only remove if it's our script (not a custom user script)
        if (packageJson.scripts[scriptName] === 'changelog-add' || 
            packageJson.scripts[scriptName] === 'changelog-release') {
          delete packageJson.scripts[scriptName];
          scriptsRemoved.push(scriptName);
        } else {
          scriptsNotFound.push(`${scriptName} (custom script preserved)`);
        }
      } else {
        scriptsNotFound.push(scriptName);
      }
    }

    // Write back to package.json if changes were made
    if (scriptsRemoved.length > 0) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      
      console.log('\n' + '='.repeat(60));
      console.log('🧹 git-changelog-manager cleanup completed');
      console.log('✅ Removed npm scripts from package.json:');
      console.log(`   ${scriptsRemoved.join(', ')}`);
      
      if (scriptsNotFound.length > 0) {
        console.log(`ℹ️  Not found/preserved: ${scriptsNotFound.join(', ')}`);
      }
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('📦 git-changelog-manager: No scripts to remove (may be custom)');
    }

  } catch (error) {
    console.log('⚠️  git-changelog-manager: Could not auto-remove npm scripts:', error.message);
    console.log('   You may want to manually remove these scripts from package.json:');
    console.log('   "changelog:add" and "changelog:release"');
  }
}

// Only run if this is being executed directly (not required)
if (require.main === module) {
  removeChangelogScripts();
}

module.exports = removeChangelogScripts;
