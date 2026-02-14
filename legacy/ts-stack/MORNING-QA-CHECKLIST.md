# Sprint 1 Morning QA Checklist
**Date:** August 16, 2025  
**Objective:** Complete Sprint 1 and prepare for retrospective

## 🔧 PRIORITY 1: Resolve Deployment Access

### [ ] Fix Vercel SSO Protection
- [ ] Login to Vercel dashboard
- [ ] Navigate to Team Settings → Security  
- [ ] Disable team-level SSO protection temporarily
- [ ] Verify public access to staging URLs
- [ ] Test: `curl -I https://[staging-url]` returns 200, not 401

### [ ] Verify Production Deployment
- [ ] Push to main branch triggers auto-deployment
- [ ] Production URL accessible publicly
- [ ] Farm discovery page loads at `/farms`
- [ ] Search functionality working
- [ ] Farm detail drawer opens correctly

## 📋 PRIORITY 2: Complete Code Review Process

### [ ] Create Individual PRs
```bash
# Create PR for LOC-6
gh pr create --base main --head feature/loc-6-farm-discovery-page \
  --title "LOC-6: Farm Discovery Page with Infinite Scroll" \
  --body "Sprint 1 story implementation with comprehensive testing"

# Create PR for LOC-7  
gh pr create --base main --head feature/loc-7-location-search \
  --title "LOC-7: Location-Based Search with Real-time Results" \
  --body "Search functionality with debouncing and URL state"

# Create PR for LOC-8
gh pr create --base main --head feature/loc-8-farm-detail-drawer \
  --title "LOC-8: Farm Detail Drawer with Mobile Gestures" \
  --body "Mobile-optimized detail view with swipe-to-close"
```

### [ ] Review and Merge Process
- [ ] Assign @brandonqueener as reviewer via CODEOWNERS
- [ ] Verify CI checks pass on all PRs
- [ ] Confirm staging deployments generate preview URLs
- [ ] Manual QA test each PR's preview environment
- [ ] Merge PRs in order: LOC-6 → LOC-7 → LOC-8

## 🧪 PRIORITY 3: Manual QA Testing

### [ ] Farm Discovery Page (LOC-6)
- [ ] **Mobile (iPhone):** Farm grid responsive (1 column)
- [ ] **Tablet (iPad):** Farm grid responsive (2 columns)  
- [ ] **Desktop:** Farm grid responsive (3 columns)
- [ ] **Infinite scroll:** Load more farms on scroll
- [ ] **Loading states:** Skeleton components display
- [ ] **Empty state:** "No farms found" message
- [ ] **Error handling:** API failure retry mechanism

### [ ] Location Search (LOC-7)
- [ ] **Real-time search:** Results update as typing (300ms debounce)
- [ ] **ZIP code search:** "11201" finds Brooklyn farms
- [ ] **City search:** "brooklyn" finds relevant results
- [ ] **Farm name search:** Partial name matching works
- [ ] **Search history:** localStorage persistence
- [ ] **URL state:** Search term in URL for sharing
- [ ] **Mobile keyboard:** inputMode="search" optimization
- [ ] **Search validation:** Invalid characters blocked

### [ ] Farm Detail Drawer (LOC-8)
- [ ] **Drawer open:** Click farm card opens detail view
- [ ] **Farm info:** Name, description, location display
- [ ] **Image gallery:** Multiple photos with navigation
- [ ] **Contact info:** Address and details shown
- [ ] **Close methods:** X button, Escape key, backdrop click
- [ ] **Mobile gestures:** Swipe right to close (50px minimum)
- [ ] **URL state:** ?farm=id parameter updates
- [ ] **Accessibility:** ARIA labels, screen reader support
- [ ] **Keyboard nav:** Tab through elements, focus management

## 📊 PRIORITY 4: Performance & Metrics

### [ ] Core Web Vitals (Mobile)
- [ ] **LCP (Largest Contentful Paint):** <2.5s
- [ ] **FID (First Input Delay):** <100ms  
- [ ] **CLS (Cumulative Layout Shift):** <0.1
- [ ] **Search response time:** <500ms

### [ ] Lighthouse Scores
- [ ] **Performance:** >90
- [ ] **Accessibility:** >90
- [ ] **Best Practices:** >90
- [ ] **SEO:** >90

### [ ] Browser Compatibility
- [ ] **Chrome:** Latest version fully functional
- [ ] **Safari:** iOS/macOS compatibility verified
- [ ] **Firefox:** No rendering issues
- [ ] **Edge:** Windows compatibility checked

## 🎯 PRIORITY 5: Sprint 1 Completion

### [ ] Linear Tickets Update
- [ ] LOC-9: Mark functional testing as ✅ COMPLETED
- [ ] LOC-10: Mark functional testing as ✅ COMPLETED  
- [ ] LOC-11: Mark functional testing as ✅ COMPLETED
- [ ] Move all Sprint 1 stories to "Done" status

### [ ] Final Documentation
- [ ] Update CLAUDE.md with completion status
- [ ] Commit Sprint 1 status report
- [ ] Tag release: `git tag v1.0.0-sprint1`
- [ ] Push tags: `git push --tags`

## 🔄 SPRINT 1 RETROSPECTIVE PREPARATION

### [ ] Metrics Collection
- [ ] Test coverage report: `pnpm test:coverage`
- [ ] Bundle size analysis
- [ ] API response time measurements
- [ ] User flow completion rates

### [ ] Success Criteria Verification
- ✅ Consumers can view farms in organized layout
- ✅ Location-based search returns relevant results  
- ✅ Farm details provide comprehensive information
- ✅ 100% mobile responsive experience
- [ ] Page load performance <2s *(pending production test)*
- [ ] Search results <500ms *(pending production test)*

## 🚀 SPRINT 2 TRANSITION

### [ ] Backlog Preparation
- [ ] LOC-12: Backend API Integration (ready for development)
- [ ] LOC-13: User Authentication (Clerk integration)
- [ ] LOC-15: Branch Protection Rules (GitHub configuration)
- [ ] LOC-16: Mandatory Testing Requirements (CI enforcement)

---

**Estimated Completion Time:** 2-3 hours  
**Success Criteria:** All checkboxes completed, Sprint 1 retrospective ready

**Emergency Contacts:**
- Vercel Support: If SSO issues persist
- GitHub Actions: Check workflow runs for debugging
- Local Development: `pnpm dev` for immediate testing

**Quick Commands:**
```bash
# Verify all tests pass
cd apps/web && pnpm test

# Check production build
cd apps/web && pnpm build

# Start local development
cd apps/web && pnpm dev
```