# Publishing Guide for @sippar/x402-sdk

This guide explains how to publish the X402 SDK to NPM for public distribution.

## 📋 Pre-Publication Checklist

### 1. Verify Package Quality

```bash
# Type check
npm run typecheck

# Lint code
npm run lint

# Build package
npm run build

# Verify build outputs
ls -la dist/
```

Expected outputs:
- `dist/index.js` (CommonJS)
- `dist/index.esm.js` (ES Modules)
- `dist/index.d.ts` (TypeScript definitions)
- Source maps for debugging

### 2. Verify Package Contents

```bash
# Preview what will be published
npm pack --dry-run

# Create actual package for inspection
npm pack
tar -tzf sippar-x402-sdk-1.0.0.tgz
```

### 3. Test Package Locally

```bash
# Install globally for testing
npm install -g ./

# Or test in another project
cd /path/to/test-project
npm install /path/to/x402-sdk/
```

## 🚀 Publishing Process

### Initial Publication (v1.0.0)

1. **Verify NPM Account**:
   ```bash
   npm whoami
   npm login  # if not already logged in
   ```

2. **Final Build and Verification**:
   ```bash
   npm run prepublishOnly
   ```

3. **Publish to NPM**:
   ```bash
   npm publish --access public
   ```

### Subsequent Versions

#### Patch Release (Bug fixes: 1.0.0 → 1.0.1)
```bash
npm run version:patch
npm run publish:npm
```

#### Minor Release (New features: 1.0.0 → 1.1.0)
```bash
npm run version:minor
npm run publish:npm
```

#### Major Release (Breaking changes: 1.0.0 → 2.0.0)
```bash
npm run version:major
npm run publish:npm
```

## 📝 Version Management

### Semantic Versioning Guidelines

- **Patch (1.0.x)**: Bug fixes, documentation updates, internal improvements
- **Minor (1.x.0)**: New features, additional methods, enhanced functionality
- **Major (x.0.0)**: Breaking changes, API changes, removed features

### Version Update Process

1. **Update CHANGELOG.md**:
   ```markdown
   ## [1.0.1] - 2025-09-XX
   ### Fixed
   - Fixed issue with token validation
   - Improved error messages
   ```

2. **Update package.json version**:
   ```bash
   npm version patch  # or minor/major
   ```

3. **Tag and push**:
   ```bash
   git push origin main --tags
   ```

4. **Publish**:
   ```bash
   npm publish
   ```

## 🔒 Security Considerations

### Before Publishing

- **Remove debug code**: No console.log statements
- **Verify dependencies**: Only production dependencies included
- **Security audit**: Run `npm audit` and fix issues
- **Token safety**: No hardcoded tokens or secrets

### NPM Package Security

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for known security issues
npm run security-check  # if configured
```

## 📊 Post-Publication Verification

### 1. Verify NPM Package

```bash
# Check package exists
npm view @sippar/x402-sdk

# Install and test
npm install @sippar/x402-sdk
```

### 2. Test Installation

Create test project:
```bash
mkdir test-x402-install
cd test-x402-install
npm init -y
npm install @sippar/x402-sdk
```

Test basic import:
```javascript
// test.js
const { X402Client } = require('@sippar/x402-sdk');
console.log('X402Client imported successfully:', typeof X402Client);
```

### 3. Update Documentation

- Update README with latest version info
- Update examples with correct version numbers
- Announce release in relevant channels

## 🚦 Continuous Integration

### GitHub Actions Automation

The package includes automated CI/CD:

```yaml
# Automatically runs on:
- Push to main branch
- Pull request creation
- Manual workflow dispatch

# Pipeline includes:
- TypeScript compilation
- ESLint analysis
- Package building
- Automated NPM publication (on main branch)
```

### Manual Override

If automated publishing fails:

```bash
# Build locally
npm run build

# Publish manually
npm publish --access public
```

## 🌟 Distribution Channels

### Primary Distribution

- **NPM Registry**: `npm install @sippar/x402-sdk`
- **CDN**: `https://unpkg.com/@sippar/x402-sdk`
- **jsDelivr**: `https://cdn.jsdelivr.net/npm/@sippar/x402-sdk`

### Secondary Distribution

- **GitHub Packages**: Automatic sync from NPM
- **Enterprise Registries**: Can be mirrored for enterprise use

## 📈 Monitoring & Analytics

### NPM Statistics

Monitor package adoption:
- **Downloads**: Weekly/monthly download counts
- **Versions**: Version adoption rates
- **Dependencies**: Projects using the package

### Usage Analytics

Track through:
- NPM download statistics
- GitHub repository analytics
- Community feedback and issues

## 🔄 Maintenance Schedule

### Regular Updates

- **Security**: Monthly dependency updates
- **Documentation**: Quarterly review and updates
- **Features**: Based on community feedback
- **Compatibility**: With each major Node.js release

### Long-term Support

- **v1.x**: Supported until v2.0 release
- **Security patches**: For all supported versions
- **Bug fixes**: For current major version

## ⚠️ Troubleshooting

### Common Publication Issues

**Authentication Error**:
```bash
npm login
npm whoami  # verify login
```

**Build Errors**:
```bash
rm -rf node_modules dist
npm install
npm run build
```

**Version Conflicts**:
```bash
npm version --help
git tag -l  # list existing tags
```

**Permission Issues**:
```bash
npm owner ls @sippar/x402-sdk
npm access ls-packages
```

### Recovery Procedures

**Unpublish (within 24 hours)**:
```bash
npm unpublish @sippar/x402-sdk@1.0.0
```

**Deprecate Version**:
```bash
npm deprecate @sippar/x402-sdk@1.0.0 "Please upgrade to 1.0.1"
```

---

## 📞 Support

For publication issues:
- **NPM Support**: https://www.npmjs.com/support
- **Package Issues**: GitHub Issues
- **Internal Questions**: Team Slack/Email

**Remember**: Once published to NPM, packages cannot be modified. Always test thoroughly before publishing.