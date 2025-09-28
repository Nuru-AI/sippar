# Contributing to @sippar/x402-sdk

Thank you for your interest in contributing to the X402 SDK! This guide will help you get started with contributing to the world's first autonomous AI-to-AI payment system.

## 🚀 Getting Started

### Prerequisites

- Node.js >=16.0.0
- TypeScript >=4.5.0
- Git for version control

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Nuru-AI/sippar.git
   cd sippar/packages/x402-sdk
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Run type checking**:
   ```bash
   npm run typecheck
   ```

## 📋 Development Workflow

### Code Structure

```
src/
├── index.ts          # Main exports
├── X402Client.ts     # Core SDK client
├── types.ts          # TypeScript interfaces
├── errors.ts         # Error classes
├── utils.ts          # Utility functions
└── constants.ts      # Configuration constants
```

### Scripts

- `npm run build` - Build the package
- `npm run dev` - Watch mode for development
- `npm run typecheck` - TypeScript compilation check
- `npm run lint` - ESLint code analysis
- `npm test` - Run test suite (when available)

## 🎯 Contribution Guidelines

### Types of Contributions

We welcome several types of contributions:

1. **Bug Reports** - Report issues with existing functionality
2. **Feature Requests** - Suggest new features or improvements
3. **Code Contributions** - Submit code changes via pull requests
4. **Documentation** - Improve or add documentation
5. **Examples** - Add integration examples and tutorials

### Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (Node.js version, operating system)
- **Code examples** that demonstrate the issue

Use the bug report template:

```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Node.js version:
- TypeScript version:
- Operating system:
- SDK version:

## Code Example
```typescript
// Minimal code example that reproduces the issue
```
```

### Feature Requests

For feature requests, please include:

- **Use case** - Why is this feature needed?
- **Proposed solution** - How should it work?
- **Alternatives** - What alternatives have you considered?
- **Examples** - Code examples of how it would be used

### Code Contributions

#### Before You Start

1. **Check existing issues** to avoid duplication
2. **Discuss large changes** in an issue first
3. **Follow coding standards** outlined below
4. **Write tests** for new functionality (when test suite is available)

#### Coding Standards

**TypeScript Guidelines**:
- Use strict TypeScript configuration
- Provide comprehensive type definitions
- Avoid `any` type - use specific types or generics
- Document public APIs with JSDoc comments

**Code Style**:
- Use 2-space indentation
- Use semicolons consistently
- Use single quotes for strings
- Use descriptive variable and function names
- Keep functions focused and small

**Error Handling**:
- Use custom error classes from `src/errors.ts`
- Provide meaningful error messages
- Include context in error details when helpful

**Documentation**:
- Document all public methods with JSDoc
- Include usage examples in complex functions
- Update README.md for new features
- Add entries to CHANGELOG.md

#### Example Code Contribution

```typescript
/**
 * Validates payment amount and returns formatted value
 * @param amount Payment amount in USD
 * @returns Formatted amount string
 * @throws {Error} If amount is invalid
 *
 * @example
 * ```typescript
 * const formatted = validateAmount(0.05);
 * console.log(formatted); // "$0.05"
 * ```
 */
export function validateAmount(amount: number): string {
  if (amount < 0.01 || amount > 100.0) {
    throw new Error(`Invalid amount: ${amount}. Must be between $0.01 and $100.00`);
  }

  return formatPaymentAmount(amount);
}
```

### Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

4. **Update documentation** as needed

5. **Commit your changes** with clear commit messages:
   ```bash
   git commit -m "feat: add payment amount validation utility"
   ```

6. **Push to your fork** and create a pull request

7. **Fill out the pull request template** with:
   - Description of changes
   - Testing performed
   - Breaking changes (if any)
   - Related issues

#### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual testing performed

## Breaking Changes
List any breaking changes and migration path

## Related Issues
Closes #(issue number)
```

## 🔒 Security Considerations

### Security-First Development

- **No hardcoded secrets** in code or documentation
- **Validate all inputs** to prevent injection attacks
- **Use TypeScript** for type safety and error prevention
- **Follow security best practices** for HTTP client usage
- **Report security issues** privately to security@nuru.network

### Payment Security

- **Never log payment tokens** or sensitive information
- **Validate token formats** before processing
- **Use HTTPS** for all API communications
- **Implement proper error handling** to avoid information leakage

## 🎨 Code Style Examples

### Good Examples

```typescript
// ✅ Good: Clear typing and error handling
export async function createPayment(
  request: X402PaymentRequest
): Promise<X402PaymentResponse> {
  if (!request.service || !request.amount) {
    throw new X402Error('Missing required payment parameters');
  }

  try {
    const response = await this.httpClient.post('/x402/create-payment', request);
    return response.data;
  } catch (error) {
    throw new X402Error('Payment creation failed', error);
  }
}

// ✅ Good: Comprehensive interface
interface PaymentConfig {
  service: string;
  amount: number;
  metadata?: Record<string, unknown>;
}
```

### Examples to Avoid

```typescript
// ❌ Bad: Using 'any' type
function processPayment(data: any): any {
  return data.result;
}

// ❌ Bad: No error handling
async function getPayment(id: string) {
  const response = await fetch(`/payment/${id}`);
  return response.json();
}

// ❌ Bad: Unclear variable names
function calc(x: number, y: number): number {
  return x * y * 0.02;
}
```

## 📚 Documentation Standards

### API Documentation

All public methods should include:

```typescript
/**
 * Brief description of what the method does
 *
 * @param paramName Description of parameter
 * @returns Description of return value
 * @throws {ErrorType} When this error occurs
 *
 * @example
 * ```typescript
 * const result = await client.methodName(parameter);
 * console.log(result);
 * ```
 */
```

### README Updates

When adding new features:

1. Update the feature list
2. Add usage examples
3. Update the API reference section
4. Add any new configuration options
5. Update the changelog

## 🌟 Recognition

Contributors will be recognized in:

- **CHANGELOG.md** for significant contributions
- **README.md** contributors section
- **GitHub contributors** page
- **Release notes** for major features

## 📞 Getting Help

- **GitHub Issues** - For bugs and feature requests
- **GitHub Discussions** - For questions and community discussion
- **Documentation** - Check existing docs first
- **Email** - developers@nuru.network for private inquiries

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the future of autonomous AI-to-AI commerce! 🚀