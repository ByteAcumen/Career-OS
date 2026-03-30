import { execSync } from 'child_process';

console.log("Starting GitHub Contribution Backfill for the past 365 days...");

const DAYS_TO_FILL = 365;
let commitsCreated = 0;

for (let i = DAYS_TO_FILL; i >= 0; i--) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - i);
  // Give it a realistic time around 6 PM
  targetDate.setHours(18, 0, 0, 0);
  
  const dateString = targetDate.toISOString();
  
  try {
    execSync(`git commit --allow-empty -m "Chore: daily sync"`, {
      env: { 
        ...process.env, 
        GIT_AUTHOR_DATE: dateString, 
        GIT_COMMITTER_DATE: dateString 
      },
      stdio: 'ignore' // Suppress output so it doesn't flood the terminal
    });
    commitsCreated++;
  } catch (err) {
    console.error(`Failed to create commit for ${dateString}`, err.message);
  }
}

console.log(`\n✅ Successfully generated ${commitsCreated} historical commits! Run 'git push origin main' to light up your GitHub graph.`);
