# 🔍 CryptoLens Certik Scraper

> **Advanced cryptocurrency security data collection platform powered by CertikSkynet**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Puppeteer](https://img.shields.io/badge/Puppeteer-24.10.0-blue.svg)](https://pptr.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-2.50.0-orange.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/yourusername/cryptolens-certik/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🚀 Overview

CryptoLens is a comprehensive cryptocurrency security intelligence platform that automatically scrapes, analyzes, and stores security metrics from CertikSkynet for the top 1000 cryptocurrencies. Built with enterprise-grade reliability and automated scheduling.

### 🎯 Why CryptoLens?

In the rapidly evolving crypto landscape, security intelligence is crucial. CryptoLens bridges the gap between raw security data and actionable insights by providing:

- **🔄 Real-time Security Monitoring** for top 1000 cryptocurrencies
- **📊 Automated Data Collection** with 85-90% success rate
- **🛡️ Enterprise-grade Reliability** with advanced error handling
- **⚡ Optimized Performance** processing 1000+ coins in 24-27 hours

### ✨ Key Features

- 🛡️ **Security Scoring** - Comprehensive security metrics and ratings
- 📊 **Community Analytics** - Twitter engagement and sentiment analysis
- 💰 **Financial Data** - Market cap, volume, and price tracking
- 🔄 **Automated Scheduling** - Smart cron-based updates every 48 hours
- 🎯 **Intelligent Targeting** - Only scrapes expired data to optimize resources
- 🔒 **Overlap Protection** - Prevents concurrent scraping conflicts
- 📈 **Scalable Architecture** - Handles 1000+ coins efficiently
- 🛠️ **Error Recovery** - Advanced retry mechanisms and fault tolerance

## 📋 Prerequisites

- **Node.js** 18+
- **pnpm** package manager
- **Supabase** account and database
- **4GB+ RAM** (for browser automation)

## ⚡ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/cryptolens-certik-scraper.git
cd scrape_certik
pnpm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Add your credentials
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Initialization

```bash
# Upload top 1000 coins from CoinGecko
pnpm run upload-coins
```

### 4. Start Scraping

```bash
# One-time manual scrape
pnpm run scrape-certik

# Or start automated scheduler
pnpm run start-cron
```

## 🎮 Available Scripts

| Command                  | Description                                     | Use Case                       |
| ------------------------ | ----------------------------------------------- | ------------------------------ |
| `pnpm run upload-coins`  | 📥 Fetch & update top 1000 coins from CoinGecko | Initial setup, monthly updates |
| `pnpm run scrape-certik` | 🔍 Manual scraping session                      | Testing, immediate data needs  |
| `pnpm run start-cron`    | ⏰ Start automated scheduler                    | Production deployment          |

## 🏗️ Architecture

### Data Flow

```
CoinGecko API → Supabase DB → CertikSkynet Scraper → Enriched Database
     ↓              ↓                ↓                      ↓
  Top 1000      Coin List      Security Data          Complete Dataset
```

### Core Components

- **🕷️ Scraper Engine** (`Scraper.js`) - Puppeteer-based web scraping
- **📊 Database Layer** (`certikScraperSupabase.js`) - Supabase integration
- **⏰ Scheduler** (`cronScraper.js`) - Automated task management
- **🪙 Coin Management** (`uploadCoinsToSupabase.js`) - CoinGecko sync

## 📊 Database Schema

```sql
Table: certik_coins
├── coin_gecko_id (TEXT, UNIQUE) - CoinGecko identifier
├── symbol (TEXT) - Cryptocurrency symbol
├── name (TEXT) - Full coin name
├── market_cap_rank (INTEGER) - Market ranking
├── certik_data (JSONB) - Complete security metrics
├── certik_last_updated (TIMESTAMPTZ) - Last scrape time
├── certik_next_update (TIMESTAMPTZ) - Next scheduled update
├── certik_scrape_attempts (INTEGER) - Retry counter
└── certik_last_error (TEXT) - Error logging
```

## 🔧 Configuration

### Scraping Parameters

```javascript
const scraper = new CertikScraperSupabase({
  batchSize: 3, // Parallel scraping limit
  maxRetries: 3, // Retry attempts per coin
  updateInterval: 48, // Hours between updates
});
```

### Scheduling Options

```javascript
// Check every 12 hours for expired coins
cron.schedule("0 */12 * * *", scraperFunction);
```

## 📈 Performance Metrics

| Metric              | Value               | Notes                       |
| ------------------- | ------------------- | --------------------------- |
| **Scraping Speed**  | ~80-90 seconds/coin | Including retries & waits   |
| **Success Rate**    | 85-90%              | Varies by coin availability |
| **Memory Usage**    | ~500MB-1GB          | Per batch of 3 coins        |
| **Full Cycle Time** | ~24-27 hours        | For 1000 coins              |
| **Data Freshness**  | 48 hours            | Configurable interval       |

## 🛡️ Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start scheduler
pm2 start cronScraper.js --name "certik-cron"

# Enable auto-restart on boot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs certik-cron
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm && pnpm install
COPY . .
CMD ["pnpm", "run", "start-cron"]
```

## 🔍 Monitoring & Debugging

### Log Analysis

```bash
# Real-time monitoring
pm2 logs certik-cron --lines 100

# Check scraping status
pm2 monit
```

### Common Issues & Solutions

| Issue              | Cause                 | Solution                |
| ------------------ | --------------------- | ----------------------- |
| **Timeout Errors** | Slow page loading     | Increase timeout values |
| **Rate Limiting**  | Too many requests     | Reduce batch size       |
| **Memory Leaks**   | Long-running sessions | Restart PM2 process     |
| **Stale Data**     | Missing updates       | Check cron schedule     |

## 📊 Data Output Example

```json
{
  "project": "Bitcoin",
  "securityScores": {
    "averageScore": "97.53",
    "additionalMetrics": [
      { "label": "Security Rank", "value": "1" },
      { "label": "Community Trust", "value": "High" }
    ]
  },
  "communityEngagement": [
    { "label": "Twitter Followers (24h)", "value": "1.2M" },
    { "label": "Twitter Activity Indicator", "value": "High" }
  ],
  "financialData": {
    "metrics": [
      { "label": "Market Cap", "value": "$1.2T" },
      { "label": "Volume (24h)", "value": "$15.3B" }
    ],
    "dailyInflows": [{ "label": "Net Inflow", "value": "+$127M" }]
  }
}
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Add tests for new features
- Update documentation
- Use conventional commit messages

## 📄 License

This project is licensed under the **ISC License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CertikSkynet** - Security data provider
- **CoinGecko** - Cryptocurrency market data
- **Supabase** - Database and backend services
- **Puppeteer** - Web scraping framework

## 🚨 Important Notes

### ⚠️ Rate Limiting & Ethics

- **Respect CertikSkynet's terms of service**
- **Use reasonable delays** between requests
- **Don't overload their servers** - default settings are optimized
- **For commercial use**, consider reaching out to Certik directly

### 🔒 Security Considerations

- **Keep your .env file secure** and never commit it
- **Use strong Supabase credentials**
- **Monitor your scraping logs** for unusual activity
- **Regular database backups** are recommended

## 📞 Support

- 🐛 **Bug Reports** - [Open an Issue](issues)
- 💡 **Feature Requests** - [Discussions](discussions)
- 📧 **Contact** - [Your Email](mailto:your-email@example.com)
- 💬 **Community** - [Discord Server](https://discord.gg/your-server)

---

<div align="center">

**⭐ Star this repo if it helped you! ⭐**

Made with ❤️ for the crypto community

</div>
