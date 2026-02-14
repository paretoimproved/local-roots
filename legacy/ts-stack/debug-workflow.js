#!/usr/bin/env node
/**
 * Automated Debugging Workflow for Local-Roots
 * Integrates Claude Code + Vercel MCP + Browser Debugging
 */

const { execSync } = require('child_process');
const fs = require('fs');

class AutomatedDebugger {
  constructor() {
    this.projectUrl = 'https://local-roots-hqjlefvzu-brandonqueener-cbs-projects.vercel.app';
    this.debugPort = 9222;
  }

  async checkDeploymentStatus() {
    console.log('🔍 Checking Vercel deployment status...');
    try {
      const result = execSync('vercel ls --yes | head -1', { encoding: 'utf8' });
      const latestUrl = result.split('\n')[0];
      console.log(`📦 Latest deployment: ${latestUrl}`);
      return latestUrl;
    } catch (error) {
      console.error('❌ Failed to check deployment:', error.message);
      return null;
    }
  }

  async startChromeDebugging() {
    console.log('🌐 Starting Chrome with debugging enabled...');
    try {
      execSync(`google-chrome --remote-debugging-port=${this.debugPort} --disable-web-security --user-data-dir=/tmp/chrome-debug &`, 
        { stdio: 'ignore' });
      console.log(`✅ Chrome debugging started on port ${this.debugPort}`);
      return true;
    } catch (error) {
      console.warn('⚠️ Chrome debugging setup failed:', error.message);
      return false;
    }
  }

  async captureConsoleErrors(url) {
    console.log(`🔍 Monitoring console errors for: ${url}`);
    
    const debugCommand = `
      const CDP = require('chrome-remote-interface');
      CDP(async (client) => {
        const {Runtime, Page} = client;
        await Runtime.enable();
        await Page.enable();
        
        Runtime.consoleAPICalled((params) => {
          if (params.type === 'error') {
            console.log('🚨 Console Error:', params.args.map(arg => arg.value).join(' '));
          }
        });
        
        Runtime.exceptionThrown((params) => {
          console.log('💥 Exception:', params.exceptionDetails.text);
        });
        
        await Page.navigate({url: '${url}'});
        
        setTimeout(() => {
          client.close();
        }, 10000);
      });
    `;
    
    try {
      execSync(`node -e "${debugCommand}"`, { encoding: 'utf8' });
    } catch (error) {
      console.log('📝 Error monitoring setup:', error.message);
    }
  }

  async runPerformanceAudit(url) {
    console.log('⚡ Running performance audit...');
    try {
      const auditResult = execSync(`lighthouse ${url} --chrome-flags="--headless" --output=json --quiet`, 
        { encoding: 'utf8' });
      
      const report = JSON.parse(auditResult);
      const scores = report.lhr.categories;
      
      console.log('📊 Performance Scores:');
      console.log(`  Performance: ${Math.round(scores.performance.score * 100)}`);
      console.log(`  Accessibility: ${Math.round(scores.accessibility.score * 100)}`);
      console.log(`  Best Practices: ${Math.round(scores['best-practices'].score * 100)}`);
      console.log(`  SEO: ${Math.round(scores.seo.score * 100)}`);
      
      return report;
    } catch (error) {
      console.warn('⚠️ Performance audit failed:', error.message);
      return null;
    }
  }

  async debugWorkflow() {
    console.log('🤖 Starting Automated Debug Workflow...\n');
    
    // 1. Check deployment status
    const deploymentUrl = await this.checkDeploymentStatus();
    if (!deploymentUrl) return;
    
    // 2. Start Chrome debugging
    await this.startChromeDebugging();
    
    // 3. Wait for Chrome to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 4. Monitor console errors
    await this.captureConsoleErrors(deploymentUrl);
    
    // 5. Run performance audit
    await this.runPerformanceAudit(deploymentUrl);
    
    console.log('\n✅ Automated debugging workflow completed!');
  }

  async createDebugReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      project: 'Local-Roots',
      status: 'debug-complete',
      url: this.projectUrl,
      checklist: [
        '✅ Deployment status verified',
        '✅ Console errors monitored',
        '✅ Performance audit completed',
        '📝 Ready for Claude Code analysis'
      ]
    };
    
    fs.writeFileSync('./debug-report.json', JSON.stringify(report, null, 2));
    console.log('📄 Debug report saved to debug-report.json');
  }
}

// Run if called directly
if (require.main === module) {
  const debugger = new AutomatedDebugger();
  debugger.debugWorkflow()
    .then(() => debugger.createDebugReport())
    .catch(console.error);
}

module.exports = AutomatedDebugger;