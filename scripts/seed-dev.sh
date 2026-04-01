#!/bin/bash
# Seed dev environment with test questions and a test bar
# Usage: bash scripts/seed-dev.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/dev-env.sh"

echo "Seeding dev questions (incremental)..."
node backend/seed/seed-questions.js --stage dev --incremental

echo ""
echo "Creating test bar (DEVBR)..."
node -e "
const { TABLE, put } = require('./backend/shared/dynamo');
(async () => {
  try {
    await put(TABLE.BARS, {
      PK: 'BAR#DEVBR',
      barCode: 'DEVBR',
      barName: 'Dev Test Bar',
      ownerEmail: 'dev@test.com',
      state: 'NY',
      city: 'Test City',
      createdAt: new Date().toISOString()
    });
    console.log('Test bar created: DEVBR');
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') {
      console.log('Test bar DEVBR already exists');
    } else {
      throw e;
    }
  }
})();
"

echo ""
echo "Dev environment seeded. Use bar code: DEVBR"
