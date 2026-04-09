import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataPath = path.join(__dirname, '../src/data/rankings.json');
const exportDir = path.join(__dirname, '../export');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

function toCSV(rows, headers) {
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

// overall_rankings.csv
const overallHeaders = [
  'rank', 'title', 'totalScore', 'genre', 'weeksOnChart',
  'avgRank', 'isNetflixOriginal', 'isAllAtOnce', 'length', 'firstWeek', 'lastWeek'
];
const overallCSV = toCSV(data.overallRankings, overallHeaders);
fs.writeFileSync(path.join(exportDir, 'overall_rankings.csv'), '\ufeff' + overallCSV, 'utf-8');
console.log(`overall_rankings.csv: ${data.overallRankings.length} 筆`);

// daily_rankings.csv
const dailyHeaders = ['date', 'showTitle', 'netflixRank', 'myVideoRank'];
const dailyCSV = toCSV(data.dailyRankings, dailyHeaders);
fs.writeFileSync(path.join(exportDir, 'daily_rankings.csv'), '\ufeff' + dailyCSV, 'utf-8');
console.log(`daily_rankings.csv: ${data.dailyRankings.length} 筆`);

console.log(`\n匯出完成！檔案位於: ${exportDir}`);
