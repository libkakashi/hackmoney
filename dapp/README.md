# Nyx - Crowdfund Bounties for Open Source Issues

Nyx is a platform for open source projects to launch tokens and crowdfund bounties for issue resolution.

## What is Nyx?

Nyx enables:

- **Launch project tokens** in one transaction with instant liquidity
- **Crowdfund issue bounties** - anyone can add rewards to issues they care about
- **Automatic reward splitting** - contributors who help resolve issues split the bounty
- **Tradable rewards** - tokens are liquid immediately, contributors can hold or sell
- **Community-powered development** - users incentivize the fixes and features they need

## Why Token Bounties?

Traditional bounty platforms are broken:
- **Project-only funding**: Only maintainers can set bounties
- **Fiat payments**: Slow, manual payouts with no upside for contributors
- **No collaboration**: Hard to split rewards across multiple helpers

Nyx provides a better way:
- **Crowdfunded**: Anyone - projects, users, community - can add bounties
- **Instant liquid rewards**: Contributors get tradable tokens immediately
- **Automatic splitting**: Multiple contributors automatically split bounties
- **Aligned incentives**: Token value grows with project success
- **Faster resolution**: Critical issues get resolved quickly with community funding

## How It Works

1. **Launch Project Token**: Deploy a token with name, symbol, and description in one transaction
2. **Initial Distribution**: 30-minute launch window where supporters and contributors participate fairly
3. **Crowdfund Bounties**: Projects, users, or anyone can add token bounties to issues
4. **Contributors Earn**: Resolve issues and automatically split bounties with collaborators

## Key Features

- **Crowdfunded Bounties**: Anyone can add rewards to issues they care about
- **Automatic Splitting**: Bounties split across all contributors who helped
- **Instant Liquidity**: Tokens are tradable immediately after launch
- **Fair Access**: No whales, no bots, no insider advantages during launches
- **Permissionless**: Anyone can launch, add bounties, or contribute
- **Transparent**: All bounties and rewards on-chain and immutable
- **Zero Platform Fees**: Only pay gas costs for deployment

## Getting Started

### Development

First, install dependencies:

```bash
bun install
```

Then run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Project Structure

- `src/app/` - Next.js app router pages
- `src/components/` - React components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations
- `src/graphql/` - GraphQL queries and generated types
- `src/abi/` - Smart contract ABIs

## Technology Stack

- **Next.js 15** - React framework
- **Uniswap V4** - Liquidity and token launches
- **Wagmi** - Ethereum interactions
- **GraphQL** - Data fetching
- **TailwindCSS** - Styling

## Learn More

- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [Next.js Documentation](https://nextjs.org/docs)

## Use Cases

### For Open Source Projects
- Launch a project token to create sustainable funding
- Set bounties on critical bugs or features
- Let community crowdfund additional bounties for issues they care about
- Reward multiple contributors automatically when issues are resolved

### For Contributors
- Browse projects and find high-value bounties
- Collaborate with others and automatically split rewards
- Earn tradable tokens that appreciate with project success
- Get paid instantly in liquid tokens, not slow fiat payments

### For Users & Community
- Crowdfund bounties for bugs that affect you
- Add rewards to feature requests you want prioritized
- Speed up issue resolution by incentivizing developers
- Become a stakeholder in projects you use

## Contributing

We welcome contributions! Whether it's bug fixes, feature additions, documentation improvements, or design updates, your help makes Nyx better for the open source community.

## License

[Add your license here]