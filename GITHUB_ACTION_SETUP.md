# GitHub Action NPM Publishing Setup

This repository includes an automated GitHub Action that publishes new versions to NPM whenever the main branch is updated with a version change.

## 🔐 Required Setup

### 1. NPM Token
You need to create an NPM token and add it to your GitHub repository secrets.

**Steps:**
1. Go to [npmjs.com](https://www.npmjs.com) and log in
2. Click your profile → "Access Tokens"
3. Click "Generate New Token" → "Classic Token"
4. Choose "Automation" (for CI/CD)
5. Copy the generated token

### 2. Add GitHub Secret
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: Paste the NPM token from step 1

## 🚀 How It Works

The GitHub Action will automatically:

1. **Trigger** when `package.json` is changed on the main branch
2. **Check** if the version in package.json already exists on NPM
3. **Publish** to NPM if it's a new version
4. **Create** a GitHub release with the same version tag
5. **Notify** about the successful publication

## 🔄 Workflow

Your typical release process becomes:

```bash
# Make your changes
git add .
git commit -m "✨ Add cool new feature"

# Bump version (this triggers the action)
npm version patch  # or minor/major
git push origin main
git push --tags

# 🎉 GitHub Action automatically publishes to NPM!
```

## 🛡️ Safety Features

- **Duplicate Prevention**: Won't publish if version already exists
- **Smart Triggering**: Only runs when package.json changes
- **Version Validation**: Checks NPM registry before publishing
- **Automatic Releases**: Creates GitHub releases automatically

## 🎯 Customization

Edit `.github/workflows/npm-publish.yml` to:
- Change Node.js version
- Add different triggers (tags, releases, etc.)
- Modify release notes format
- Add additional steps (testing, building, etc.)

## 🔍 Monitoring

Check the "Actions" tab in your GitHub repository to see:
- Publication status
- Build logs
- Error messages (if any)

## 🚨 Troubleshooting

**Action not running?**
- Ensure `package.json` was actually changed
- Check that commit message contains "version" or it's a tag

**NPM publish failed?**
- Verify NPM_TOKEN secret is set correctly
- Check if you have publish permissions to the package
- Ensure package name is available (for new packages)

**GitHub release failed?**
- The GITHUB_TOKEN is automatically provided by GitHub
- No additional setup needed for this step
