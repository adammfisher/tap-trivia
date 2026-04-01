#!/bin/bash
# Source this file to set dev environment variables for local scripts
# Usage: source scripts/dev-env.sh

export TABLE_GAMES=Dev-TapTrivia-Games
export TABLE_QUESTIONS=Dev-TapTrivia-Questions
export TABLE_QUESTION_USAGE=Dev-TapTrivia-QuestionUsage
export TABLE_ANSWERS=Dev-TapTrivia-Answers
export TABLE_PLAYERS=Dev-TapTrivia-Players
export TABLE_BARS=Dev-TapTrivia-Bars
export TABLE_GAME_STATS=Dev-TapTrivia-GameStats
export TABLE_SESSIONS=Dev-TapTrivia-Sessions
export TABLE_FEEDBACK=Dev-TapTrivia-Feedback

echo "Dev environment variables set (Dev-TapTrivia-* tables)"
