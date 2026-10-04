#!/bin/bash
# deploy.sh - Commits and pushes the Aether Hub codebase

LOGFILE="deploy_log.txt"

echo "=== Deployment Started: $(date) ===" > "$LOGFILE"

echo "Staging files..." | tee -a "$LOGFILE"
git add . >> "$LOGFILE" 2>&1

echo "Committing..." | tee -a "$LOGFILE"
git commit -m "Massive architectural overhaul: Multi-screen UX, Maps, Gemini Audio" >> "$LOGFILE" 2>&1

echo ""
echo "=========================================================="
echo "Pushing to GitHub Pages. (Please enter your SSH passphrase if prompted below)"
echo "=========================================================="
echo ""

# Run git push directly so it can securely access the TTY for your passphrase
git push

if [ $? -eq 0 ]; then
  echo "Deployment SUCCESS!" >> "$LOGFILE"
  echo "Done! The code has been successfully pushed."
else
  echo "Deployment FAILED!" >> "$LOGFILE"
  echo "Error during push. See deploy_log.txt for details."
fi
