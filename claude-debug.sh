#!/bin/bash
# Claude Code Automated Debugging Integration
# Usage: ./claude-debug.sh [URL]

set -e

URL=${1:-"https://local-roots-hqjlefvzu-brandonqueener-cbs-projects.vercel.app"}
DEBUG_PORT=9222
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="./debug-reports"

echo "🤖 Claude Code Automated Browser Debugging"
echo "📅 Timestamp: $TIMESTAMP"
echo "🌐 Target URL: $URL"
echo ""

# Create debug reports directory
mkdir -p $REPORT_DIR

# 1. Check Vercel deployment status
echo "1️⃣ Checking Vercel deployment status..."
DEPLOYMENT_STATUS=$(vercel ls --yes 2>/dev/null | head -2 | tail -1 || echo "No deployment found")
echo "   📦 Latest: $DEPLOYMENT_STATUS"

# 2. Start Chrome with debugging if not already running
echo "2️⃣ Setting up Chrome debugging..."
if ! curl -s "http://localhost:$DEBUG_PORT/json" > /dev/null 2>&1; then
    echo "   🌐 Starting Chrome with remote debugging..."
    nohup google-chrome \
        --remote-debugging-port=$DEBUG_PORT \
        --disable-web-security \
        --disable-features=VizDisplayCompositor \
        --user-data-dir=/tmp/chrome-debug-$TIMESTAMP \
        --headless \
        > /dev/null 2>&1 &
    sleep 3
else
    echo "   ✅ Chrome debugging already running on port $DEBUG_PORT"
fi

# 3. Capture console logs and errors
echo "3️⃣ Capturing browser console logs..."
CONSOLE_LOG="$REPORT_DIR/console_$TIMESTAMP.log"
timeout 10s node -e "
const CDP = require('chrome-remote-interface');
CDP().then(async (client) => {
    const {Runtime, Page, Network} = client;
    await Runtime.enable();
    await Page.enable();
    await Network.enable();
    
    const logs = [];
    
    Runtime.consoleAPICalled((params) => {
        const message = params.args.map(arg => arg.value || arg.description || '[Object]').join(' ');
        logs.push({
            type: 'console.' + params.type,
            message: message,
            timestamp: new Date().toISOString()
        });
    });
    
    Runtime.exceptionThrown((params) => {
        logs.push({
            type: 'exception',
            message: params.exceptionDetails.text || params.exceptionDetails.exception?.description || 'Unknown error',
            timestamp: new Date().toISOString(),
            stack: params.exceptionDetails.stackTrace
        });
    });
    
    Network.responseReceived((params) => {
        if (params.response.status >= 400) {
            logs.push({
                type: 'network_error',
                message: \`\${params.response.status} - \${params.response.url}\`,
                timestamp: new Date().toISOString()
            });
        }
    });
    
    await Page.navigate({url: '$URL'});
    
    setTimeout(() => {
        console.log(JSON.stringify(logs, null, 2));
        client.close();
    }, 8000);
}).catch(console.error);
" > $CONSOLE_LOG 2>/dev/null || echo "[]" > $CONSOLE_LOG

echo "   📝 Console logs saved to: $CONSOLE_LOG"

# 4. Run performance audit with Lighthouse
echo "4️⃣ Running Lighthouse performance audit..."
LIGHTHOUSE_REPORT="$REPORT_DIR/lighthouse_$TIMESTAMP.json"
if command -v lighthouse > /dev/null; then
    lighthouse "$URL" \
        --chrome-flags="--headless --remote-debugging-port=$DEBUG_PORT" \
        --output=json \
        --output-path="$LIGHTHOUSE_REPORT" \
        --quiet \
        --throttling-method=devtools > /dev/null 2>&1 || echo "Lighthouse audit failed"
    
    if [ -f "$LIGHTHOUSE_REPORT" ]; then
        echo "   ⚡ Performance report saved to: $LIGHTHOUSE_REPORT"
        
        # Extract key metrics
        PERFORMANCE=$(cat "$LIGHTHOUSE_REPORT" | jq -r '.lhr.categories.performance.score * 100 // "N/A"')
        ACCESSIBILITY=$(cat "$LIGHTHOUSE_REPORT" | jq -r '.lhr.categories.accessibility.score * 100 // "N/A"')
        FCP=$(cat "$LIGHTHOUSE_REPORT" | jq -r '.lhr.audits["first-contentful-paint"].displayValue // "N/A"')
        LCP=$(cat "$LIGHTHOUSE_REPORT" | jq -r '.lhr.audits["largest-contentful-paint"].displayValue // "N/A"')
        
        echo "   📊 Performance: $PERFORMANCE%, Accessibility: $ACCESSIBILITY%"
        echo "   ⏱️  FCP: $FCP, LCP: $LCP"
    fi
else
    echo "   ⚠️  Lighthouse not installed - skipping performance audit"
fi

# 5. Generate comprehensive debug report
echo "5️⃣ Generating debug report..."
DEBUG_REPORT="$REPORT_DIR/debug_summary_$TIMESTAMP.json"

cat > "$DEBUG_REPORT" << EOF
{
  "timestamp": "$TIMESTAMP",
  "url": "$URL",
  "deployment_status": "$DEPLOYMENT_STATUS",
  "console_errors": $(cat "$CONSOLE_LOG" 2>/dev/null || echo "[]"),
  "performance_scores": {
    "performance": $(echo "$PERFORMANCE" | grep -o '^[0-9]*' || echo "null"),
    "accessibility": $(echo "$ACCESSIBILITY" | grep -o '^[0-9]*' || echo "null"),
    "fcp": "$FCP",
    "lcp": "$LCP"
  },
  "claude_code_actions": [
    "Review console errors for critical issues",
    "Analyze performance bottlenecks", 
    "Check deployment configuration",
    "Verify functional testing requirements"
  ]
}
EOF

echo "   📋 Debug summary saved to: $DEBUG_REPORT"

# 6. Claude Code Integration Message
echo ""
echo "🎯 Claude Code Integration Ready!"
echo "   📂 Reports available in: $REPORT_DIR"
echo "   🔍 Console logs: $CONSOLE_LOG"
echo "   ⚡ Performance: $LIGHTHOUSE_REPORT"
echo "   📋 Summary: $DEBUG_REPORT"
echo ""
echo "🤖 Next Steps:"
echo "   1. Open Claude Code"
echo "   2. Share: 'Analyze debug report: $DEBUG_REPORT'"
echo "   3. Claude will automatically review all captured data"
echo ""

# Optional: Auto-open in Claude Code if available
if command -v claude-code > /dev/null; then
    echo "🚀 Auto-opening in Claude Code..."
    claude-code --file "$DEBUG_REPORT"
fi