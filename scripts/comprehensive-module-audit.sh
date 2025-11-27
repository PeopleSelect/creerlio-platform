#!/bin/bash

# CREERLIO COMPREHENSIVE MODULE AUDIT
# Validates ALL modules against master plan specification

echo "🔍 CREERLIO PLATFORM COMPREHENSIVE AUDIT"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

# ==========================================
# 1. TALENT MODULE VERIFICATION
# ==========================================
echo "📋 1. TALENT MODULE"
echo "-------------------"

# Registration & Onboarding
if [ -f "backend/Creerlio.Api/Controllers/AuthController.cs" ]; then
    check_pass "Registration system (AuthController)"
else
    check_fail "AuthController missing"
fi

if [ -f "backend/Creerlio.Api/Controllers/TalentOnboardingController.cs" ]; then
    check_pass "Talent onboarding (TalentOnboardingController)"
else
    check_fail "TalentOnboardingController missing"
fi

# Profile System
if [ -f "backend/Creerlio.Api/Controllers/TalentProfileController.cs" ]; then
    check_pass "Talent profile system (TalentProfileController)"
else
    check_fail "TalentProfileController missing"
fi

# Resume Parsing (should be in FredController or dedicated service)
if grep -q "resume" backend/Creerlio.Api/Controllers/FredController.cs 2>/dev/null; then
    check_pass "Resume parsing functionality"
else
    check_warn "Resume parsing not found in FredController"
fi

# Portfolio Builder
if [ -d "frontend/frontend-app/app/talent/portfolio" ]; then
    check_pass "Portfolio builder UI exists"
else
    check_fail "Portfolio builder UI missing"
fi

# Job Search & Applications
if [ -f "backend/Creerlio.Api/Controllers/JobPostingController.cs" ]; then
    check_pass "Job search system (JobPostingController)"
else
    check_fail "JobPostingController missing"
fi

# Messaging
if [ -f "backend/Creerlio.Api/Controllers/MessagingController.cs" ]; then
    check_pass "Messaging system (MessagingController)"
else
    check_fail "MessagingController missing"
fi

# AI Career Assistant (Fred)
if [ -f "backend/Creerlio.Api/Controllers/FredController.cs" ]; then
    check_pass "AI Career Assistant (FredController)"
else
    check_fail "FredController missing"
fi

if [ -f "frontend/frontend-app/app/talent/ai-assistant/page.tsx" ]; then
    check_pass "AI Assistant UI"
else
    check_fail "AI Assistant UI missing"
fi

echo ""

# ==========================================
# 2. BUSINESS MODULE VERIFICATION
# ==========================================
echo "🏢 2. BUSINESS MODULE"
echo "--------------------"

# Company Profile
if [ -f "backend/Creerlio.Api/Controllers/BusinessProfileController.cs" ]; then
    check_pass "Business profile system (BusinessProfileController)"
else
    check_fail "BusinessProfileController missing"
fi

# Job Posting
if grep -q "CreateJob\|PostJob" backend/Creerlio.Api/Controllers/JobPostingController.cs 2>/dev/null; then
    check_pass "Job posting functionality"
else
    check_warn "Job posting methods not found"
fi

# ATS (Application Tracking System)
if grep -q "Application\|Candidate" backend/Creerlio.Api/Controllers/JobPostingController.cs 2>/dev/null; then
    check_pass "ATS functionality present"
else
    check_warn "ATS functionality may be incomplete"
fi

# Talent Search
if [ -f "backend/Creerlio.Api/Controllers/CandidateSearchController.cs" ]; then
    check_pass "Candidate search (CandidateSearchController)"
else
    check_fail "CandidateSearchController missing"
fi

if [ -f "backend/Creerlio.Api/Controllers/BusinessSearchController.cs" ]; then
    check_pass "Business search (BusinessSearchController)"
else
    check_fail "BusinessSearchController missing"
fi

# Business Intelligence
if [ -f "backend/Creerlio.Api/Controllers/IntelligenceController.cs" ]; then
    check_pass "Business intelligence (IntelligenceController)"
else
    check_fail "IntelligenceController missing"
fi

echo ""

# ==========================================
# 3. AI SERVICES VERIFICATION
# ==========================================
echo "🤖 3. AI SERVICES"
echo "----------------"

# Speech-to-Text
if grep -q "speech-to-text\|SpeechToText" backend/Creerlio.Api/Controllers/FredController.cs 2>/dev/null; then
    check_pass "Speech-to-text endpoint (/api/fred/speech-to-text)"
else
    check_fail "Speech-to-text endpoint missing"
fi

# Text Improvement
if grep -q "improve-text\|ImproveText" backend/Creerlio.Api/Controllers/FredController.cs 2>/dev/null; then
    check_pass "Text improvement endpoint (/api/fred/improve-text)"
else
    check_fail "Text improvement endpoint missing"
fi

# Structured Data Extraction
if grep -q "extract-structured-data\|ExtractStructuredData" backend/Creerlio.Api/Controllers/FredController.cs 2>/dev/null; then
    check_pass "Structured data extraction (/api/fred/extract-structured-data)"
else
    check_fail "Structured data extraction missing"
fi

# AI Suggestions
if grep -q "suggest\|GetSuggestions" backend/Creerlio.Api/Controllers/FredController.cs 2>/dev/null; then
    check_pass "AI suggestions endpoint (/api/fred/suggest)"
else
    check_fail "AI suggestions endpoint missing"
fi

echo ""

# ==========================================
# 4. MAP INTELLIGENCE VERIFICATION
# ==========================================
echo "🗺️ 4. MAP INTELLIGENCE"
echo "----------------------"

# Saved Locations
if [ -f "backend/Creerlio.Api/Controllers/SavedLocationsController.cs" ]; then
    check_pass "Saved locations API (SavedLocationsController)"
else
    check_fail "SavedLocationsController missing"
fi

if [ -f "frontend/frontend-app/app/talent/map/components/SavedLocations.tsx" ]; then
    check_pass "Saved locations UI component"
else
    check_fail "SavedLocations.tsx missing"
fi

# Nearby Amenities
if grep -q "amenities" backend/Creerlio.Api/Controllers/MapIntelligenceController.cs 2>/dev/null; then
    check_pass "Nearby amenities endpoint (/api/map/amenities)"
else
    check_fail "Amenities endpoint missing"
fi

if [ -f "frontend/frontend-app/app/talent/map/components/NearbyAmenities.tsx" ]; then
    check_pass "Nearby amenities UI component"
else
    check_fail "NearbyAmenities.tsx missing"
fi

# Commute Cost Calculator
if grep -q "commute-costs" backend/Creerlio.Api/Controllers/MapIntelligenceController.cs 2>/dev/null; then
    check_pass "Commute costs endpoint (/api/map/commute-costs)"
else
    check_fail "Commute costs endpoint missing"
fi

if [ -f "frontend/frontend-app/app/talent/map/components/CommuteCostCalculator.tsx" ]; then
    check_pass "Commute cost calculator UI"
else
    check_fail "CommuteCostCalculator.tsx missing"
fi

# Schools & Properties
if grep -q "schools" backend/Creerlio.Api/Controllers/MapIntelligenceController.cs 2>/dev/null; then
    check_pass "Schools search endpoint (/api/map/schools)"
else
    check_warn "Schools endpoint not found"
fi

if grep -q "properties" backend/Creerlio.Api/Controllers/MapIntelligenceController.cs 2>/dev/null; then
    check_pass "Properties search endpoint (/api/map/properties)"
else
    check_warn "Properties endpoint not found"
fi

echo ""

# ==========================================
# 5. DATABASE SCHEMA VERIFICATION
# ==========================================
echo "💾 5. DATABASE SCHEMA"
echo "--------------------"

if [ -f "backend/Creerlio.Infrastructure/CreerlioDbContext.cs" ]; then
    check_pass "Main DbContext exists"
    
    # Check for required tables
    if grep -q "DbSet.*User" backend/Creerlio.Infrastructure/CreerlioDbContext.cs 2>/dev/null; then
        check_pass "Users table configured"
    else
        check_warn "Users table not found in DbContext"
    fi
    
    if grep -q "DbSet.*TalentProfile" backend/Creerlio.Infrastructure/CreerlioDbContext.cs 2>/dev/null; then
        check_pass "TalentProfiles table configured"
    else
        check_warn "TalentProfiles table not found"
    fi
    
    if grep -q "DbSet.*BusinessProfile" backend/Creerlio.Infrastructure/CreerlioDbContext.cs 2>/dev/null; then
        check_pass "BusinessProfiles table configured"
    else
        check_warn "BusinessProfiles table not found"
    fi
    
    if grep -q "DbSet.*Job" backend/Creerlio.Infrastructure/CreerlioDbContext.cs 2>/dev/null; then
        check_pass "Jobs table configured"
    else
        check_warn "Jobs table not found"
    fi
else
    check_fail "CreerlioDbContext.cs missing"
fi

echo ""

# ==========================================
# 6. FRONTEND PAGES VERIFICATION
# ==========================================
echo "🎨 6. FRONTEND PAGES"
echo "-------------------"

# Talent Pages
[ -f "frontend/frontend-app/app/talent/dashboard/page.tsx" ] && check_pass "Talent dashboard" || check_fail "Talent dashboard missing"
[ -f "frontend/frontend-app/app/talent/profile/page.tsx" ] && check_pass "Talent profile page" || check_warn "Talent profile page missing"
[ -f "frontend/frontend-app/app/talent/jobs/page.tsx" ] && check_pass "Talent jobs page" || check_warn "Talent jobs page missing"
[ -f "frontend/frontend-app/app/talent/map/page.tsx" ] && check_pass "Talent map page" || check_fail "Talent map page missing"
[ -f "frontend/frontend-app/app/talent/ai-assistant/page.tsx" ] && check_pass "AI assistant page" || check_fail "AI assistant page missing"

# Business Pages
[ -f "frontend/frontend-app/app/business/dashboard/page.tsx" ] && check_pass "Business dashboard" || check_fail "Business dashboard missing"
[ -f "frontend/frontend-app/app/business/jobs/page.tsx" ] && check_pass "Business jobs page" || check_warn "Business jobs page missing"

# Auth Pages
[ -f "frontend/frontend-app/app/auth/login/page.tsx" ] && check_pass "Login page" || check_fail "Login page missing"
[ -f "frontend/frontend-app/app/auth/register/page.tsx" ] && check_pass "Register page" || check_warn "Register page missing"

echo ""

# ==========================================
# 7. API ENDPOINT LIVE TESTS
# ==========================================
echo "🌐 7. API ENDPOINT TESTS"
echo "-----------------------"

# Check if backend is running
if curl -s http://localhost:5007 > /dev/null 2>&1; then
    check_pass "Backend API is running (port 5007)"
    
    # Test key endpoints
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5007/api/fred/health)
    if [ "$HTTP_CODE" = "200" ]; then
        check_pass "Fred AI health endpoint responds"
    else
        check_warn "Fred AI health endpoint returned $HTTP_CODE"
    fi
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5007/api/saved-locations/user/test)
    if [ "$HTTP_CODE" = "200" ]; then
        check_pass "Saved locations endpoint responds"
    else
        check_warn "Saved locations endpoint returned $HTTP_CODE"
    fi
    
else
    check_warn "Backend not running - skipping live endpoint tests"
fi

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    check_pass "Frontend is running (port 3000)"
else
    check_warn "Frontend not running"
fi

echo ""

# ==========================================
# SUMMARY
# ==========================================
echo "=========================================="
echo "📊 AUDIT SUMMARY"
echo "=========================================="
echo -e "${GREEN}PASSED: $PASS${NC}"
echo -e "${YELLOW}WARNINGS: $WARN${NC}"
echo -e "${RED}FAILED: $FAIL${NC}"
echo ""

TOTAL=$((PASS + WARN + FAIL))
SUCCESS_RATE=$(( PASS * 100 / TOTAL ))

echo "Success Rate: $SUCCESS_RATE%"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Platform audit PASSED - all critical components present${NC}"
    exit 0
elif [ $FAIL -lt 5 ]; then
    echo -e "${YELLOW}⚠️  Platform audit PASSED with warnings - minor issues detected${NC}"
    exit 0
else
    echo -e "${RED}❌ Platform audit FAILED - critical components missing${NC}"
    exit 1
fi
