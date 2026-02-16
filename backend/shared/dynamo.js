/**
 * Tap Trivia — DynamoDB Client Helper
 * Shared across all Lambda functions and seed scripts.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand
} = require('@aws-sdk/lib-dynamodb');

const isLocal = process.env.DYNAMODB_LOCAL === 'true';

const client = new DynamoDBClient(
  isLocal
    ? { region: 'us-east-1', endpoint: 'http://localhost:8000' }
    : { region: process.env.AWS_REGION || 'us-east-1' }
);

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

const TABLE = {
  GAMES: process.env.TABLE_GAMES || 'TapTrivia-Games',
  QUESTIONS: process.env.TABLE_QUESTIONS || 'TapTrivia-Questions',
  QUESTION_USAGE: process.env.TABLE_QUESTION_USAGE || 'TapTrivia-QuestionUsage',
  ANSWERS: process.env.TABLE_ANSWERS || 'TapTrivia-Answers',
  PLAYERS: process.env.TABLE_PLAYERS || 'TapTrivia-Players',
  BARS: process.env.TABLE_BARS || 'TapTrivia-Bars',
  GAME_STATS: process.env.TABLE_GAME_STATS || 'TapTrivia-GameStats',
  SESSIONS: process.env.TABLE_SESSIONS || 'TapTrivia-Sessions'
};

async function get(tableName, key) {
  const res = await docClient.send(new GetCommand({ TableName: tableName, Key: key }));
  return res.Item || null;
}

async function put(tableName, item, condition) {
  const params = { TableName: tableName, Item: item };
  if (condition) params.ConditionExpression = condition;
  return docClient.send(new PutCommand(params));
}

async function query(tableName, params) {
  const allItems = [];
  let lastKey;
  do {
    const cmd = { TableName: tableName, ...params };
    if (lastKey) cmd.ExclusiveStartKey = lastKey;
    const res = await docClient.send(new QueryCommand(cmd));
    if (res.Items) allItems.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return allItems;
}

async function scan(tableName, params = {}) {
  const allItems = [];
  let lastKey;
  do {
    const cmd = { TableName: tableName, ...params };
    if (lastKey) cmd.ExclusiveStartKey = lastKey;
    const res = await docClient.send(new ScanCommand(cmd));
    if (res.Items) allItems.push(...res.Items);
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return allItems;
}

async function update(tableName, key, updateExpression, expressionValues, expressionNames) {
  const params = {
    TableName: tableName,
    Key: key,
    UpdateExpression: updateExpression,
    ReturnValues: 'ALL_NEW'
  };
  if (expressionValues) params.ExpressionAttributeValues = expressionValues;
  if (expressionNames) params.ExpressionAttributeNames = expressionNames;
  const res = await docClient.send(new UpdateCommand(params));
  return res.Attributes;
}

async function batchWrite(tableName, items) {
  const chunks = [];
  for (let i = 0; i < items.length; i += 25) {
    chunks.push(items.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    let requests = chunk.map(item => ({
      PutRequest: { Item: item }
    }));

    let retries = 0;
    while (requests.length > 0 && retries < 5) {
      const res = await docClient.send(new BatchWriteCommand({
        RequestItems: { [tableName]: requests }
      }));
      const unprocessed = res.UnprocessedItems && res.UnprocessedItems[tableName];
      if (!unprocessed || unprocessed.length === 0) break;
      requests = unprocessed;
      retries++;
      await new Promise(r => setTimeout(r, 100 * Math.pow(2, retries)));
    }
  }
}

module.exports = {
  docClient,
  TABLE,
  get,
  put,
  query,
  scan,
  update,
  batchWrite,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand
};
