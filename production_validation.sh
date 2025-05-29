#!/bin/bash
# Final validation script for Bonus Management System
# This script performs comprehensive validation checks in the production environment

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration
BACKEND_URL="https://bonus.example.com/api"
FRONTEND_URL="https://bonus.example.com"
LOG_FILE="validation_results.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${GREEN}=== Bonus Management System Production Validation ===${NC}"
echo "Starting validation at $(date)"
echo "Starting validation at $(date)" > $LOG_FILE

# Function to log results
log_result() {
  local test_name=$1
  local status=$2
  local message=$3
  
  echo -e "${test_name}: ${status} - ${message}"
  echo "${test_name}: ${status} - ${message}" >> $LOG_FILE
}

# Check backend health
echo -e "\n${YELLOW}Checking backend health...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/health" | grep -q "200"; then
  log_result "Backend Health" "${GREEN}PASS${NC}" "Health endpoint returned 200 OK"
else
  log_result "Backend Health" "${RED}FAIL${NC}" "Health endpoint did not return 200 OK"
fi

# Check frontend loading
echo -e "\n${YELLOW}Checking frontend loading...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}" | grep -q "200"; then
  log_result "Frontend Loading" "${GREEN}PASS${NC}" "Frontend loaded successfully"
else
  log_result "Frontend Loading" "${RED}FAIL${NC}" "Frontend failed to load"
fi

# Check API endpoints
echo -e "\n${YELLOW}Checking API endpoints...${NC}"
endpoints=(
  "/api/templates"
  "/api/rules"
  "/api/instances"
  "/api/reports/summary"
)

for endpoint in "${endpoints[@]}"; do
  if curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TEST_TOKEN" "${BACKEND_URL}${endpoint}" | grep -q "2[0-9][0-9]"; then
    log_result "API Endpoint ${endpoint}" "${GREEN}PASS${NC}" "Endpoint returned 2xx status code"
  else
    log_result "API Endpoint ${endpoint}" "${RED}FAIL${NC}" "Endpoint did not return 2xx status code"
  fi
done

# Check database connection
echo -e "\n${YELLOW}Checking database connection...${NC}"
if curl -s -H "Authorization: Bearer $TEST_TOKEN" "${BACKEND_URL}/health/db" | grep -q "connected"; then
  log_result "Database Connection" "${GREEN}PASS${NC}" "Database connection successful"
else
  log_result "Database Connection" "${RED}FAIL${NC}" "Database connection failed"
fi

# Check monitoring systems
echo -e "\n${YELLOW}Checking monitoring systems...${NC}"
# Prometheus
if curl -s -o /dev/null -w "%{http_code}" "http://prometheus:9090/-/healthy" | grep -q "200"; then
  log_result "Prometheus" "${GREEN}PASS${NC}" "Prometheus is healthy"
else
  log_result "Prometheus" "${YELLOW}WARN${NC}" "Prometheus health check failed"
fi

# Grafana
if curl -s -o /dev/null -w "%{http_code}" "http://grafana:3000/api/health" | grep -q "200"; then
  log_result "Grafana" "${GREEN}PASS${NC}" "Grafana is healthy"
else
  log_result "Grafana" "${YELLOW}WARN${NC}" "Grafana health check failed"
fi

# Elasticsearch
if curl -s -o /dev/null -w "%{http_code}" "http://elasticsearch:9200/_cluster/health" | grep -q "200"; then
  log_result "Elasticsearch" "${GREEN}PASS${NC}" "Elasticsearch is healthy"
else
  log_result "Elasticsearch" "${YELLOW}WARN${NC}" "Elasticsearch health check failed"
fi

# Check SSL configuration
echo -e "\n${YELLOW}Checking SSL configuration...${NC}"
ssl_result=$(curl -s -I https://bonus.example.com | grep -i "strict-transport-security")
if [[ ! -z "$ssl_result" ]]; then
  log_result "SSL Configuration" "${GREEN}PASS${NC}" "HSTS header is present"
else
  log_result "SSL Configuration" "${YELLOW}WARN${NC}" "HSTS header is missing"
fi

# Check performance
echo -e "\n${YELLOW}Checking performance...${NC}"
response_time=$(curl -s -w "%{time_total}\n" -o /dev/null "${FRONTEND_URL}")
if (( $(echo "$response_time < 2.0" | bc -l) )); then
  log_result "Frontend Performance" "${GREEN}PASS${NC}" "Response time: ${response_time}s"
else
  log_result "Frontend Performance" "${YELLOW}WARN${NC}" "Response time: ${response_time}s (above threshold)"
fi

api_response_time=$(curl -s -w "%{time_total}\n" -o /dev/null -H "Authorization: Bearer $TEST_TOKEN" "${BACKEND_URL}/templates")
if (( $(echo "$api_response_time < 1.0" | bc -l) )); then
  log_result "API Performance" "${GREEN}PASS${NC}" "Response time: ${api_response_time}s"
else
  log_result "API Performance" "${YELLOW}WARN${NC}" "Response time: ${api_response_time}s (above threshold)"
fi

# Check for security headers
echo -e "\n${YELLOW}Checking security headers...${NC}"
security_headers=(
  "X-Content-Type-Options"
  "X-Frame-Options"
  "X-XSS-Protection"
)

for header in "${security_headers[@]}"; do
  if curl -s -I "${FRONTEND_URL}" | grep -i "$header" > /dev/null; then
    log_result "Security Header ${header}" "${GREEN}PASS${NC}" "Header is present"
  else
    log_result "Security Header ${header}" "${YELLOW}WARN${NC}" "Header is missing"
  fi
done

# Summarize results
echo -e "\n${GREEN}=== Validation Summary ===${NC}"
pass_count=$(grep -c "PASS" $LOG_FILE)
fail_count=$(grep -c "FAIL" $LOG_FILE)
warn_count=$(grep -c "WARN" $LOG_FILE)

echo -e "Passed: ${GREEN}${pass_count}${NC}"
echo -e "Failed: ${RED}${fail_count}${NC}"
echo -e "Warnings: ${YELLOW}${warn_count}${NC}"

if [ $fail_count -eq 0 ]; then
  echo -e "\n${GREEN}Validation completed successfully!${NC}"
  echo "The Bonus Management System is ready for production use."
else
  echo -e "\n${RED}Validation completed with failures.${NC}"
  echo "Please address the failed checks before proceeding."
  exit 1
fi

echo "Validation completed at $(date)" >> $LOG_FILE
echo "Validation results saved to ${LOG_FILE}"

exit 0
